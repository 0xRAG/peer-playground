import { openai } from "@ai-sdk/openai";
import {
  AgentKit,
  ViemWalletProvider,
  walletActionProvider,
} from "@coinbase/agentkit";
import { getVercelAITools } from "@coinbase/agentkit-vercel-ai-sdk";
import { CoreMessage, streamText } from "ai";
import dotenv from "dotenv";
import * as readline from "node:readline/promises";
import { createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

dotenv.config();

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: CoreMessage[] = [];

async function main() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  const walletProvider = new ViemWalletProvider(client);

  const agentkit = await AgentKit.from({
    walletProvider,
    actionProviders: [walletActionProvider()],
  });

  const tools = getVercelAITools(agentkit);

  while (true) {
    const userInput = await terminal.question("You: ");

    messages.push({ role: "user", content: userInput });

    const result = streamText({
      model: openai("gpt-4o-mini"),
      tools,
      messages,
      maxSteps: 10,
    });

    let fullResponse = "";
    process.stdout.write("\nAssistant: ");
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(delta);
    }
    process.stdout.write("\n\n");

    messages.push({ role: "assistant", content: fullResponse });

    console.log(userInput);
  }
}

main().catch(console.error);
