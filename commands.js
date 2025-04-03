import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const ASK_COMMAND = {
  name: 'ask',
  description: 'Ask a question to the bot!',
  options: [
    {
      name: 'question',
      description: 'The question you want to ask',
      type: 3, // STRING type
      required: true,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1],
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Displays Defang\'s official slogan with a random emoji.',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [ASK_COMMAND, TEST_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
