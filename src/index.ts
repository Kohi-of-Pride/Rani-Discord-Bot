import { Client, GatewayIntentBits, Partials, GuildMember } from 'discord.js';
import * as cron from "node-cron";
import 'dotenv/config';

const GUILD_ID = '662774317527859236';           
const EMPLOYEE_ROLE_ID = '662774855539621888';  
const PARTNER_ROLE_ID = '666390123956404244';    
const EOTW_ROLE_ID = '698495425996390441';  

const client = new Client({
	intents: [
	  GatewayIntentBits.Guilds,
	  GatewayIntentBits.GuildMembers,
	],
	partials: [Partials.GuildMember],
  });
  
  client.once('ready', async () => {
	console.log(`Logged in as ${client.user?.tag}`);
  
	// Schedule the job using node-cron.
	cron.schedule('0 0 * * 6', async () => {
	  console.log('Starting scheduled EOTW assignment job...');
	  try {
		// Fetch the guild; fetching by ID ensures you have the freshest data.
		const guild = await client.guilds.fetch(GUILD_ID);
  
		// Ensure the guild member cache is populated.
		// (If your bot is in a large guild, consider using pagination or database persistence.)
		await guild.members.fetch();
  
		// Filter eligible members: those who have either EMPLOYEE_ROLE_ID or PARTNER_ROLE_ID.
		const eligibleMembers = guild.members.cache.filter(member =>
		  member.roles.cache.has(EMPLOYEE_ROLE_ID) ||
		  member.roles.cache.has(PARTNER_ROLE_ID)
		);
  
		if (eligibleMembers.size === 0) {
		  console.log('No eligible members found for assignment.');
		  return;
		}
  
		// Remove the EOTW role from any member who currently has it.
		const currentEOTW = guild.members.cache.filter(member => member.roles.cache.has(EOTW_ROLE_ID));
		for (const member of currentEOTW.values()) {
		  await member.roles.remove(EOTW_ROLE_ID, 'Removing previous EOTW role');
		  console.log(`Removed EOTW role from ${member.user.tag}`);
		}
  
		// Randomly select one eligible member.
		const eligibleArray = Array.from(eligibleMembers.values());
		const randomMember: GuildMember = eligibleArray[Math.floor(Math.random() * eligibleArray.length)];
  
		// Assign the EOTW role to the chosen member.
		await randomMember.roles.add(EOTW_ROLE_ID, 'Assigning EOTW role');
		console.log(`Assigned EOTW role to ${randomMember.user.tag}`);
  
	  } catch (error) {
		console.error('Error during scheduled job:', error);
	  }
	});
  
	console.log('EOTW assignment job scheduled.');
  });
  
  // Log in the bot.
client.login(process.env.TOKEN);