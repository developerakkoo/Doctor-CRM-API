import speakeasy from 'speakeasy';

export const verifyTotp = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1
  });
};
