export function requiereLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

export function requiereRol(rolesPermitidos = []) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (rolesPermitidos.length && !rolesPermitidos.includes(req.session.user.rol)) {
      return res.status(403).send('No autorizado');
    }
    next();
  };
}