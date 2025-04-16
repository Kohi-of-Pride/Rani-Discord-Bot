// commandhandler.ts
import { ChatInputCommandInteraction, GuildMember, Role, ChannelType } from 'discord.js';
import { setRequiredRoles, setEOTWRole, getConfig, setEOTWChannel } from './configManager';

export async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName, guildId } = interaction;
  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.' });
    return;
  }

  // Ensure the user has administrator permissions
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: 'You must be an administrator to use this command.' });
    return;
  }

  if (commandName === 'setreqroles') {
    // Existing setreqroles command...
    const role1 = interaction.options.getRole('role1')!;
    const role2 = interaction.options.getRole('role2') as Role | null;
    const role3 = interaction.options.getRole('role3') as Role | null;
    const roles = [role1.id];
    if (role2) roles.push(role2.id);
    if (role3) roles.push(role3.id);

    setRequiredRoles(guildId, roles);
    await interaction.reply({ content: `Required roles have been set to: ${roles.join(', ')}` });

  } else if (commandName === 'seteotwrole') {
    const role = interaction.options.getRole('role')!;
    setEOTWRole(guildId, role.id);
    await interaction.reply({ content: `EOTW role has been set to: ${role.name}` });
    

  } else if (commandName === 'seteotwchannel') {
    const channel = interaction.options.getChannel('channel');
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: 'Please specify a valid text channel.',});
      return;
    }
  
    setEOTWChannel(guildId, channel.id);
    await interaction.reply({ content: `EOTW announcements will be sent to ${channel}.`,});
  }
  
  else if (commandName === 'forceeotw') {
    // Force EOTW: read config and force assign a new member
    const config = getConfig(guildId);
    if (!config || !config.requiredRoles.length || !config.eotwRole) {
      await interaction.reply({ content: 'Configuration is incomplete. Please set required roles and EOTW role first.' });
      return;
    }
    
    try {
      const guild = await interaction.guild?.fetch();
      if (!guild) throw new Error('Guild not found');
      await guild.members.fetch();
      // Get eligible members (those with at least one of the required roles)
      const eligibleMembers = guild.members.cache.filter(member =>
        config.requiredRoles.some(roleId => member.roles.cache.has(roleId))
      );
      if (eligibleMembers.size === 0) {
        await interaction.reply({ content: 'No eligible members found.' });
        return;
      }

      // Remove EOTW role from members that already have it.
      const currentEOTW = guild.members.cache.filter(member => member.roles.cache.has(config.eotwRole!));
      for (const member of currentEOTW.values()) {
        await member.roles.remove(config.eotwRole, 'Force reassigning EOTW role');
      }

      // Randomly select one eligible member
      const eligibleArray = Array.from(eligibleMembers.values());
      const randomMember = eligibleArray[Math.floor(Math.random() * eligibleArray.length)];
      await randomMember.roles.add(config.eotwRole, 'Force assigning EOTW role');

      await interaction.reply({ content: `EOTW has been forcefully assigned to ${randomMember.user.tag}` });
    } catch (error) {
      await interaction.reply({ content: `Error: ${error}` });
    }

  } else if (commandName === 'timeuntil') {
    // Calculate time until next Saturday midnight
    const nextSaturday = getNextSaturdayMidnight();
    const now = new Date();
    const diffMs = nextSaturday.getTime() - now.getTime();
    const diff = msToTime(diffMs);
    await interaction.reply({ content: `Time until next EOTW: ${diff.days}d ${diff.hours}h ${diff.minutes}m ${diff.seconds}s` });

  } else if (commandName === 'current') {
    // Show current EOTW member
    const config = getConfig(guildId);
    if (!config || !config.eotwRole) {
      await interaction.reply({ content: 'EOTW role not set. Please configure it first.' });
      return;
    }
    
    try {
      const guild = await interaction.guild?.fetch();
      if (!guild) throw new Error('Guild not found');
      await guild.members.fetch();
      const currentEOTW = guild.members.cache.find(member => member.roles.cache.has(config.eotwRole!));
      if (!currentEOTW) {
        await interaction.reply({ content: 'No member currently has the EOTW role.' });
      } else {
        await interaction.reply({ content: `The current EOTW is ${currentEOTW.user.tag}` });
      }
    } catch (error) {
      await interaction.reply({ content: `Error: ${error}` });
    }
  }
}

// Calculate next Saturday midnight
function getNextSaturdayMidnight(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // Sunday=0 ... Saturday=6
  let daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  // If today is Saturday and already past midnight, schedule for next week.
  if (daysUntilSaturday === 0 && now.getHours() !== 0) {
    daysUntilSaturday = 7;
  }
  const nextSaturday = new Date(now);
  nextSaturday.setDate(now.getDate() + daysUntilSaturday);
  nextSaturday.setHours(0, 0, 0, 0); // Set to midnight
  return nextSaturday;
}

// Convert milliseconds to days, hours, minutes, seconds.
function msToTime(duration: number) {
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  let days = Math.floor(duration / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds };
}
