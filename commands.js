import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

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

// Command containing options
const CHALLENGE_COMMAND = {
  name: 'challenge',
  description: 'Challenge to a match of rock paper scissors',
  options: [
    {
      type: 3,
      name: 'object',
      description: 'Pick your object',
      required: true,
      choices: createCommandChoices(),
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const ALL_COMMANDS = [ASK_COMMAND, TEST_COMMAND, CHALLENGE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
