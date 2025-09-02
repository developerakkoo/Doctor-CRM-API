router.get("/google/callback", async (req, res) => {
  const { code } = req.query;

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // tokens.refresh_token → long-lived (store in DB, encrypted)
  // tokens.access_token → short-lived

  // Example: Save to doctor profile
  const doctor = await Doctor.create({
    name: req.user.name,
    email: req.user.email,
    oauthRefreshToken: encrypt(tokens.refresh_token)
  });

  res.send("Doctor connected with Google successfully!");
});
