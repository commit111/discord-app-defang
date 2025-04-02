import 'dotenv/config';
import express from 'express';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// To keep track of our active games
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'ask') {
      const context = req.body.context;
      const userId = context === 0 ? req.body.member.user.id : req.body.user.id
      
      const question = data.options[0]?.value || 'No question provided';
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `You asked: \n> ${question}\n\nDoes this look correct?`,
          // Indicates it'll be an ephemeral message
          flags: InteractionResponseFlags.EPHEMERAL,
          components: [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            {
              type: MessageComponentTypes.BUTTON,
              custom_id: `continue_question_${userId}`,
              label: 'Yes',
              style: ButtonStyleTypes.PRIMARY,
            },
            {
              type: MessageComponentTypes.BUTTON,
              custom_id: `cancel_question_${userId}`,
              label: 'Cancel',
              style: ButtonStyleTypes.SECONDARY,
            },
          ],
        },
          ],
        },
      });
  }
    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: `hello world ${getRandomEmoji()}`,
        },
      });
    }

    // "challenge command"
    if (name === "challenge" && id) {
      // Interaction context
      const context = req.body.context;
      // User ID is in user field for (G)DMs, and member for servers
      const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
      // User's object choice
      const objectName = req.body.data.options[0].value;
       // Create active game using message ID as the game ID
      activeGames[id] = {
        id: userId,
        objectName,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: `Rock papers scissors challenge from <@${userId}>`,
            components: [
            {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                {
                    type: MessageComponentTypes.BUTTON,
                    // Append the game ID to use later on
                    custom_id: `accept_button_${req.body.id}`,
                    label: 'Accept',
                    style: ButtonStyleTypes.PRIMARY,
                },
                ],
            },
            ],
        },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  if (type === InteractionType.MESSAGE_COMPONENT) {
    // custom_id set in payload when sending message component
    const componentId = data.custom_id;

    if (componentId.startsWith('continue_question_')) {
      const userId = componentId.replace('continue_question_', '');
      // Trim question from the content string
      const question = req.body.message.content.split('\n')[1].replace(/^>\s*/, '').trim();

      // Send a deferred response immediately
      await res.send({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: `\n> ${question}\n\nLet me find the answer for you. This might take a moment...`,
          flags: InteractionResponseFlags.EPHEMERAL,
          components: [], // Clear the buttons
        },
      });

      try {
        // Call an external API to answer the question
        const apiResponse = await fetch('https://ask.defang.io/v1/ask', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + process.env.ASK_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: question,
          }),
        });
          // Log the raw response for debugging
        const rawResponse = await apiResponse.text();
        console.log('Raw API response:', rawResponse);
      
        if (!apiResponse.ok) {
          throw new Error(`API error! Status: ${apiResponse.status}`);
        }

        const answer = rawResponse || 'No answer provided.';

        // Follow-up API call to update the message
        const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
        await fetch(`https://discord.com/api/v10/${endpoint}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bot ${process.env.BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: `\n> ${question}\n\nHere's what I found, <@${userId}>:\n\n${answer}`,
            flags: InteractionResponseFlags.EPHEMERAL,
            components: [],
          }),
        });
      } catch (error) {
        console.error('Error fetching answer:', error);

        // Follow-up API call to send an error message
        const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;
        await fetch(`https://discord.com/api/v10/${endpoint}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bot ${process.env.BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: `\n> ${question}\n\n Sorry <@${userId}>, I couldn't fetch an answer to your question. Please try again later.`,
            flags: InteractionResponseFlags.EPHEMERAL,
            components: [],
          }),
        });
      } 
    }
    

    if (componentId.startsWith('cancel_question_')) {
      const userId = componentId.replace('cancel_question_', '');
      return res.send({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: `Your question has been canceled, <@${userId}>.`,
          flags: InteractionResponseFlags.EPHEMERAL,
          components: [],
        },
      });
    }

    if (componentId.startsWith('accept_button_')) {
      // get the associated game ID
      const gameId = componentId.replace('accept_button_', '');
      // Delete message with token in request body
      const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;
      try {
        await res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: 'What is your object of choice?',
            // Indicates it'll be an ephemeral message
            flags: InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.STRING_SELECT,
                    // Append game ID
                    custom_id: `select_choice_${gameId}`,
                    options: getShuffledOptions(),
                  },
                ],
              },
            ],
          },
        });
        // Delete previous message
        await DiscordRequest(endpoint, { method: 'DELETE' });
      } catch (err) {
        console.error('Error sending message: ', err)
      }
    } else if (componentId.startsWith('select_choice_')) {
      // get the associated game ID
      const gameId = componentId.replace('select_choice_', '');
  
      if (activeGames[gameId]) {
        // Interaction context
        const context = req.body.context;
        // Get user ID and object choice for responding user
        // User ID is in user field for (G)DMs, and member for servers
        const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
  
        // User's object choice
        const objectName = data.values[0];
  
        // Calculate result from helper function
        const resultStr = getResult(activeGames[gameId], {
          id: userId,
          objectName,
        });
  
        // Remove game from storage
      delete activeGames[gameId];
      // Update message with token in request body
      const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;

      try {
        // Send results
        await res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: resultStr },
        });
        // Update ephemeral message
        await DiscordRequest(endpoint, {
          method: 'PATCH',
          body: {
            content: 'Nice choice ' + getRandomEmoji(),
            components: []
          }
        });
      } catch (err) {
        console.error('Error sending message:', err);
      }
    }
  }
  return;
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
