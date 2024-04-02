import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const length = 14;

export const nanoid = customAlphabet(alphabet, length);
//
// function generatePublicId() {
//   return nanoid();
// }
