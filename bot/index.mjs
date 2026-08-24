import { createClient } from "@supabase/supabase-js";
import { Client, Events, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.bot" });

const discord = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SERVER_ID = process.env.DISCORD_SERVER_ID;
const SUBMISSION_CHANNEL_ID = process.env.DISCORD_SUBMISSION_CHANNEL_ID;

/*
 * Get the current Weekly Spotlight week.
 *
 * The bot uses both:
 * - week_number: to assign submissions
 * - created_at: as the automatic backfill cutoff
 */
async function getCurrentWeek() {
  const { data: currentWeek, error } = await supabase
    .from("weeks")
    .select("week_number, created_at")
    .eq("is_current", true)
    .single();

  if (error || !currentWeek) {
    console.error("Could not determine current week:", error?.message ?? "No current week found");

    return null;
  }

  return currentWeek;
}

/*
 * Check whether this exact Discord message
 * has already been stored in Supabase.
 */
async function submissionAlreadyExists(messageId) {
  const { data, error } = await supabase
    .from("submissions")
    .select("id")
    .eq("discord_message_id", messageId)
    .maybeSingle();

  if (error) {
    console.error(`Could not check submission ${messageId}:`, error.message);

    // Safer to skip than accidentally create a duplicate.
    return true;
  }

  return Boolean(data);
}

/*
 * Store one submission.
 */
async function storeSubmission(message, weekNumber) {
  const alreadyExists = await submissionAlreadyExists(message.id);

  if (alreadyExists) {
    console.log(`Already stored: "${message.channel?.name}"`);

    return;
  }

  const discordUrl = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;

  const teamName = message.channel?.name ?? "Discord Submission";

  const { error } = await supabase.from("submissions").insert({
    team_name: teamName,
    creator_name: message.author.username,
    discord_url: discordUrl,
    week_number: weekNumber,
    status: "active",
    discord_message_id: message.id,
    discord_user_id: message.author.id,
    message_content: message.content,
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      console.log(`Already stored: "${teamName}"`);

      return;
    }

    console.error(`Could not save "${teamName}":`, error.message);

    return;
  }

  console.log(`Stored "${teamName}" for Week ${weekNumber}`);
}

/*
 * Process one Discord forum thread during
 * the startup backfill.
 */
async function processThread(thread, currentWeek) {
  try {
    /*
     * Discord timestamps are milliseconds.
     * Supabase created_at is an ISO timestamp.
     */
    const weekStart = new Date(currentWeek.created_at).getTime();

    const threadCreatedAt = thread.createdTimestamp;

    if (!threadCreatedAt) {
      console.log(`Skipped "${thread.name}": creation date unavailable.`);

      return;
    }

    /*
     * Ignore forum posts created before
     * the current Weekly Spotlight began.
     */
    if (threadCreatedAt < weekStart) {
      console.log(`Skipped old post: "${thread.name}"`);

      return;
    }

    const starterMessage = await thread.fetchStarterMessage();

    if (!starterMessage) {
      console.log(`Skipped "${thread.name}": no starter message found.`);

      return;
    }

    if (starterMessage.author.bot) {
      console.log(`Skipped "${thread.name}": created by a bot.`);

      return;
    }

    await storeSubmission(starterMessage, currentWeek.week_number);
  } catch (error) {
    console.error(`Could not process thread "${thread.name}":`, error.message);
  }
}

/*
 * Scan the Discord forum whenever the bot starts.
 *
 * Only forum posts created after the current
 * week's created_at timestamp are considered.
 */
async function backfillSubmissions() {
  console.log("");
  console.log("Starting submission backfill...");

  const currentWeek = await getCurrentWeek();

  if (!currentWeek) {
    console.log("Backfill stopped because no current week was found.");

    return;
  }

  console.log(`Current week: Week ${currentWeek.week_number}`);

  console.log(`Backfill cutoff: ${currentWeek.created_at}`);

  let forumChannel;

  try {
    forumChannel = await discord.channels.fetch(SUBMISSION_CHANNEL_ID);
  } catch (error) {
    console.error("Could not fetch submissions forum:", error.message);

    return;
  }

  if (!forumChannel) {
    console.error("Submission forum channel was not found.");

    return;
  }

  if (!forumChannel.threads) {
    console.error("Configured submission channel does not support threads.");

    return;
  }

  /*
   * Use a Map so the same thread cannot
   * accidentally be processed twice.
   */
  const threads = new Map();

  /*
   * Active forum posts
   */
  try {
    const active = await forumChannel.threads.fetchActive();

    for (const [id, thread] of active.threads) {
      threads.set(id, thread);
    }

    console.log(`Found ${active.threads.size} active forum posts.`);
  } catch (error) {
    console.error("Could not fetch active forum posts:", error.message);
  }

  /*
   * Recently archived forum posts
   */
  try {
    const archived = await forumChannel.threads.fetchArchived({
      type: "public",
      limit: 100,
    });

    for (const [id, thread] of archived.threads) {
      threads.set(id, thread);
    }

    console.log(`Found ${archived.threads.size} archived forum posts.`);
  } catch (error) {
    console.error("Could not fetch archived forum posts:", error.message);
  }

  console.log(`Checking ${threads.size} total forum posts...`);

  for (const thread of threads.values()) {
    await processThread(thread, currentWeek);
  }

  console.log("");
  console.log("Backfill complete.");
  console.log("Bot is now watching for new submissions.");
  console.log("");
}

/*
 * Bot startup
 */
discord.once(Events.ClientReady, async (client) => {
  console.log(`Bot logged in as ${client.user.tag}`);

  console.log(`Watching server: ${SERVER_ID}`);

  console.log(`Watching submission forum: ${SUBMISSION_CHANNEL_ID}`);

  await backfillSubmissions();
});

/*
 * Live submission listener
 */
discord.on(Events.MessageCreate, async (message) => {
  console.log(
    "MESSAGE RECEIVED:",
    "server =",
    message.guildId,
    "channel =",
    message.channelId,
    "parent =",
    message.channel?.parentId,
    "author =",
    message.author.username,
  );

  /*
   * Ignore bot messages.
   */
  if (message.author.bot) {
    console.log("Ignored: message was created by a bot.");

    return;
  }

  /*
   * Ignore other Discord servers.
   */
  if (message.guildId !== SERVER_ID) {
    console.log("Ignored: wrong server.", "Expected =", SERVER_ID, "Received =", message.guildId);

    return;
  }

  /*
   * Accept either the main submissions
   * channel or a forum thread belonging to it.
   */
  const isSubmissionChannel =
    message.channelId === SUBMISSION_CHANNEL_ID || message.channel?.parentId === SUBMISSION_CHANNEL_ID;

  if (!isSubmissionChannel) {
    console.log(
      "Ignored: wrong channel.",
      "Expected channel/parent =",
      SUBMISSION_CHANNEL_ID,
      "Received channel =",
      message.channelId,
      "Received parent =",
      message.channel?.parentId,
    );

    return;
  }

  /*
   * A forum thread's first message has the
   * same ID as the thread.
   *
   * Anything else is just a reply and should
   * not become another submission.
   */
  if (
    message.channel?.isThread() &&
    message.channel?.parentId === SUBMISSION_CHANNEL_ID &&
    message.id !== message.channel.id
  ) {
    console.log(`Ignored: reply inside submission thread "${message.channel.name}"`);

    return;
  }

  /*
   * Always retrieve the current week fresh.
   *
   * This means starting Week 5, Week 6, etc.
   * from the website requires no bot changes.
   */
  const currentWeek = await getCurrentWeek();

  if (!currentWeek) {
    return;
  }

  /*
   * Protect against a very old Discord post
   * somehow triggering after a week change.
   */
  const weekStart = new Date(currentWeek.created_at).getTime();

  if (message.createdTimestamp < weekStart) {
    console.log(`Ignored: submission predates Week ${currentWeek.week_number}.`);

    return;
  }

  await storeSubmission(message, currentWeek.week_number);
});

/*
 * Discord login
 */
discord.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
  console.error("Discord login failed:", error);
});
