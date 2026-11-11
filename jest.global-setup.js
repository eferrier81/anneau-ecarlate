// Fuseau fixe pour des tests déterministes (heure d'été / d'hiver françaises).
module.exports = async () => {
  process.env.TZ = 'Europe/Paris';
};
