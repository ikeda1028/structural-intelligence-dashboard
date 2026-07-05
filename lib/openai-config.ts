export function getOpenAiApiKey() {
  return process.env.OPENAI_SI_API_KEY || process.env.OPENAI_API_KEY || "";
}

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

export function getOpenAiKeyStatus() {
  if (process.env.OPENAI_SI_API_KEY) return "OPENAI_SI_API_KEY";
  if (process.env.OPENAI_API_KEY) return "OPENAI_API_KEY";
  return "";
}
