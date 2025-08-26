import speakeasy from 'speakeasy';

/**
 * Generate a new TOTP secret (for setting up with Google Authenticator)
 */
export const generateOtpSecret = (doctorEmail) => {
  return speakeasy.generateSecret({
    name: `DoctorCRM (${doctorEmail})`,
    length: 20,
  });
};

/**
 * Verify the OTP token from the user
 */
export const verifyTotpCode = (doctor, userOtp) => {
  if (!doctor.otpSecret) return false;

  return speakeasy.totp.verify({
    secret: doctor.otpSecret,
    encoding: 'base32',
    token: userOtp,
    window: 1, // allow ±1 time step (30s)
  });
};

/**
 * Get the current OTP (useful for testing or SMS/email 2FA)
 */
export const getCurrentOtp = (secret) => {
  return speakeasy.totp({
    secret,
    encoding: 'base32',
  });
};
