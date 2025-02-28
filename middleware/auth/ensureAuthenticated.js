exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated() || req.url === "/add") {
    return next();
  }
  console.log("aaaaaaaaaa");
  console.log(req);
  return res.redirect("/login");
};
