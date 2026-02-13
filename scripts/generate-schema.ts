import { generateJsonSchema } from "../src/config/json-schema";

const schema = generateJsonSchema();
const json = JSON.stringify(schema, null, 2);

await Bun.write("schema.json", json);
console.log("schema.json written");
