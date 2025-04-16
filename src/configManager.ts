// configManager.ts
import * as fs from 'fs'

export interface GuildConfig {
  requiredRoles: string[]; // Role IDs that make a member eligible
  eotwRole: string | null; // The EOTW role ID for that guild
  eotwChannel: string | null; // EOTW channel to fallback to
}

const configPath = './guildConfig.json';

function loadConfig(): { [guildId: string]: GuildConfig } {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({}));
  }
  const data = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(data);
}

function saveConfig(config: { [guildId: string]: GuildConfig }): void {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function setRequiredRoles(guildId: string, roles: string[]): void {
  const config = loadConfig();
  if (!config[guildId]) {
    config[guildId] = { requiredRoles: roles, eotwRole: null, eotwChannel: null };
  } else {
    config[guildId].requiredRoles = roles;
  }
  saveConfig(config);
}

export function setEOTWRole(guildId: string, roleId: string): void {
  const config = loadConfig();
  if (!config[guildId]) {
    config[guildId] = { requiredRoles: [], eotwRole: roleId, eotwChannel: null };
  } else {
    config[guildId].eotwRole = roleId;
  }
  saveConfig(config);
}

export function getConfig(guildId: string): GuildConfig | undefined {
  const config = loadConfig();
  return config[guildId];
}

export function setEOTWChannel(guildId: string, channelId: string): void {
    const fullConfig = loadConfig();
    if (!fullConfig[guildId]) {
      fullConfig[guildId] = { requiredRoles: [], eotwRole: null, eotwChannel: channelId };
    } else {
      fullConfig[guildId].eotwChannel = channelId;
    }
    saveConfig(fullConfig);
  }
  
  
  // Function to get the EOTW channel
  export function getEOTWChannel(guildId: string): string | null {
    const config = getConfig(guildId);
    return config ? config.eotwChannel : null;
  }