const INVITE_LINK_HOST = 'athar-smac2026.web.app';

export function inviteLink(code: string) {
  return `https://${INVITE_LINK_HOST}/join/${code}`;
}

export function inviteMessage(circleName: string, code: string) {
  return [
    `Join our family circle "${circleName}" on Athar.`,
    inviteLink(code),
    `If that link does nothing, open Athar, choose Join a circle, and enter the code ${code}.`,
  ].join('\n\n');
}
