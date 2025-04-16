// index.ts
import { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import * as cron from 'node-cron';
import 'dotenv/config';
import { handleSlashCommand } from './commandhandler';
import { getEOTWChannel } from './configManager';
import * as fs from 'fs';

const TOKEN = process.env.TOKEN!
const CLIENT_ID = process.env.CLIENT_ID!;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.GuildMember],
});

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('setreqroles')
    .setDescription('Set the required role(s) for eligibility')
    .addRoleOption(option =>
      option.setName('role1')
            .setDescription('Required role 1')
            .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role2')
            .setDescription('Required role 2')
            .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName('role3')
            .setDescription('Required role 3')
            .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('seteotwrole')
    .setDescription('Set the Employee of the Week (EOTW) role')
    .addRoleOption(option =>
      option.setName('role')
            .setDescription('Role to assign as EOTW')
            .setRequired(true)
    )
    .toJSON(),
	new SlashCommandBuilder()
  .setName('seteotwchannel')
  .setDescription('Set the EOTW channel')
  .addChannelOption(option =>
    option.setName('channel')
          .setDescription('The EOTW channel')
          .setRequired(true)
  )
  .toJSON(),
  new SlashCommandBuilder()
    .setName('forceeotw')
    .setDescription('Force assign a new Employee of the Week (EOTW) immediately.')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('timeuntil')
    .setDescription('Display how long until the next EOTW (Saturday at midnight).')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('current')
    .setDescription('Display the current Employee of the Week.')
    .toJSON(),
];

// Register commands (this example registers them globally)
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();

// Listen for interactions.
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await handleSlashCommand(interaction as ChatInputCommandInteraction);
});

// Scheduled job to assign the EOTW role
cron.schedule('0 0 * * 6', async () => {
	console.log('Starting scheduled EOTW assignment job...');
	// Read and parse configuration from JSON file to ensure it's up-to-date.
	const rawData = fs.readFileSync('./guildConfig.json', 'utf-8');
	const config = JSON.parse(rawData) as { [guildId: string]: { requiredRoles: string[], eotwRole: string } };
  
	// Iterate through each guild in the config.
	for (const guildId in config) {
	  const { requiredRoles, eotwRole } = config[guildId];
	  if (!requiredRoles?.length || !eotwRole) continue;
	  try {
		const guild = await client.guilds.fetch(guildId);
		await guild.members.fetch();
		// Filter eligible members (those who possess at least one of the required roles)
		const eligibleMembers = guild.members.cache.filter(member =>
		  requiredRoles.some(roleId => member.roles.cache.has(roleId))
		);
  
		if (eligibleMembers.size === 0) {
		  console.log(`No eligible members found in ${guild.name}`);
		  continue;
		}
  
		// Remove the current EOTW role from any member that has it.
		const currentEOTW = guild.members.cache.filter(member => member.roles.cache.has(eotwRole));
		for (const member of currentEOTW.values()) {
		  await member.roles.remove(eotwRole, 'Removing previous EOTW role');
		  console.log(`[${guild.name}] Removed EOTW role from ${member.user.tag}`);
		}
  
		// Randomly select one eligible member.
		const eligibleArray = Array.from(eligibleMembers.values());
		const randomMember = eligibleArray[Math.floor(Math.random() * eligibleArray.length)];
  
		// Assign the EOTW role.
		await randomMember.roles.add(eotwRole, 'Assigning EOTW role');
		console.log(`[${guild.name}] Assigned EOTW role to ${randomMember.user.tag}`);

		try {
			await randomMember.send(`Hello chat. you are the chosen one. two three four five six seven eight nine ten 🥹 laniraxia requested that we construct an amalgam of a message to be sent to the chosen eotw, the message is as follows:\nwonderful 🥹 you are the chosen one 😇 you should add the reaction emotes in between that would be funny. this is also added <:holyshit:689713383909490711> 💩 🇵 🇴 🇴.\nahem ahem. by the decree of the board of atla skink, as the 1.6177'th messenger you won a lifetime pass to EOTW (citation needed) \n-# lifetime pass applies for one week only\n\nending line for what`);
		  } catch (error) {
			console.warn(`Could not send DM to ${randomMember.user.tag}. Attempting to send in the EOTW channel.`);
		  
			const eotwChannelId = getEOTWChannel(guildId);
			if (eotwChannelId) {
			  const eotwChannel = guild.channels.cache.get(eotwChannelId);
			  if (eotwChannel && eotwChannel.isTextBased()) {
				await eotwChannel.send(`Hello chat <@${randomMember.id}> is EOTW`);
			  } else {
				console.error('EOTW channel is not a text channel or could not be found.');
			  }
			} else {
			  console.error('EOTW channel has not been set for this guild.');
			}
		  }
	  } catch (error) {
		console.error(`Error processing guild ${guildId}:`, error);
	  }
	}
  });

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.login(process.env.TOKEN);
