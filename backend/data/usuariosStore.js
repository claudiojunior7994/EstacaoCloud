const usuarios = [];

let proximoId = 2;

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function usuarioPublico(usuario) {
  const { senhaHash, ...dadosPublicos } = usuario;
  return dadosPublicos;
}

function gerarIdUsuario() {
  const id = proximoId;
  proximoId += 1;
  return id;
}

function buscarUsuarioPorEmail(email) {
  const emailNormalizado = normalizarEmail(email);

  return usuarios.find(
    (usuario) => usuario.email === emailNormalizado
  );
}

function buscarUsuarioPorIdEmpresa(id, empresaId) {
  return usuarios.find(
    (usuario) =>
      String(usuario.id) === String(id) &&
      String(usuario.empresaId) === String(empresaId)
  );
}

module.exports = {
  usuarios,
  normalizarEmail,
  usuarioPublico,
  gerarIdUsuario,
  buscarUsuarioPorEmail,
  buscarUsuarioPorIdEmpresa,
};