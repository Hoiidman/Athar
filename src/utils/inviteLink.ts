import * as Linking from 'expo-linking';

export function inviteLink(code: string) {
  return Linking.createURL(`join/${code}`);
}

export function inviteMessage(circleName: string, code: string) {
  return [
    `Join our family circle "${circleName}" on Athar.`,
    inviteLink(code),
    `If that link does nothing, open Athar, choose Join a circle, and enter the code ${code}.`,
  ].join('\n\n');
}
