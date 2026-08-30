const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PUERTO = process.env.PORT || 4000;
const LLAVE_SECRETA = 'Tapiceria-Morab-2026-XyZ9';
const ARCHIVO_PEDIDOS = path.join(__dirname, 'pedidos.json');
const ARCHIVO_TALLERES = path.join(__dirname, 'talleres.json');
const ARCHIVO_CATALOGO = path.join(__dirname, 'catalogo_telas.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const llaveRecibida = req.headers['x-api-key'];
  if (llaveRecibida !== LLAVE_SECRETA) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
});

function leerJson(archivo) {
  if (!fs.existsSync(archivo)) return [];
  const contenido = fs.readFileSync(archivo, 'utf-8');
  return contenido ? JSON.parse(contenido) : [];
}

function guardarJson(archivo, datos) {
  fs.writeFileSync(archivo, JSON.stringify(datos, null, 2));
}

// ---------- PEDIDOS ----------

app.get('/pedidos', (req, res) => {
  const pedidos = leerJson(ARCHIVO_PEDIDOS);
  const { taller_id } = req.query;
  if (taller_id) {
    return res.json(pedidos.filter((p) => p.taller_id === taller_id));
  }
  res.json(pedidos);
});

app.post('/pedidos', (req, res) => {
  const pedidos = leerJson(ARCHIVO_PEDIDOS);
  const nuevoPedido = {
    id_sync: Date.now().toString(),
    ...req.body,
    estado: 'Solicitado',
    costo_estimado: null,
    costo_final: null,
    fecha_sync: new Date().toISOString(),
  };
  pedidos.unshift(nuevoPedido);
  guardarJson(ARCHIVO_PEDIDOS, pedidos);
  res.status(201).json(nuevoPedido);
});

app.patch('/pedidos/:id_sync', (req, res) => {
  const pedidos = leerJson(ARCHIVO_PEDIDOS);
  const index = pedidos.findIndex((p) => p.id_sync === req.params.id_sync);
  if (index === -1) return res.status(404).json({ error: 'Pedido no encontrado' });

  pedidos[index] = { ...pedidos[index], ...req.body };
  guardarJson(ARCHIVO_PEDIDOS, pedidos);
  res.json(pedidos[index]);
});

// ---------- TALLERES ----------

app.get('/talleres', (req, res) => {
  const talleres = leerJson(ARCHIVO_TALLERES);
  console.log(`[DIAGNÓSTICO] GET /talleres → devolviendo ${talleres.length} taller(es)`);
  res.json(talleres);
});

app.post('/talleres', (req, res) => {
  const talleres = leerJson(ARCHIVO_TALLERES);
  const { taller_id, nombre_usuario, nombre_taller, telefono_contacto, direccion_taller } = req.body;

  if (!taller_id || !nombre_taller) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const index = talleres.findIndex((t) => t.taller_id === taller_id);
  const registro = {
    taller_id,
    nombre_usuario: nombre_usuario || '',
    nombre_taller,
    telefono_contacto: telefono_contacto || '',
    direccion_taller: direccion_taller || '',
    actualizado_en: new Date().toISOString(),
  };

  if (index === -1) {
    talleres.push(registro);
  } else {
    talleres[index] = registro;
  }

  guardarJson(ARCHIVO_TALLERES, talleres);
  console.log(`[DIAGNÓSTICO] POST /talleres → guardado "${registro.nombre_taller}" (taller_id: ${registro.taller_id}). Total ahora: ${talleres.length}`);
  res.status(201).json(registro);
});

// ---------- CATÁLOGO DE TELAS ----------

app.get('/catalogo-telas', (req, res) => {
  const catalogo = leerJson(ARCHIVO_CATALOGO);
  const { taller_id } = req.query;
  if (taller_id) {
    return res.json(catalogo.filter((t) => t.taller_id === taller_id));
  }
  res.json(catalogo);
});

app.post('/catalogo-telas', (req, res) => {
  const catalogo = leerJson(ARCHIVO_CATALOGO);
  const { taller_id, linea, nombre, color, codigo, textura, foto_base64 } = req.body;

  if (!taller_id || !nombre || !color) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const nuevaTela = {
    id_sync: Date.now().toString(),
    taller_id,
    linea: linea || '',
    nombre,
    color,
    codigo: codigo || '',
    textura: textura || '',
    foto_base64: foto_base64 || null,
    actualizado_en: new Date().toISOString(),
  };

  catalogo.unshift(nuevaTela);
  guardarJson(ARCHIVO_CATALOGO, catalogo);
  res.status(201).json(nuevaTela);
});

app.delete('/catalogo-telas/:id_sync', (req, res) => {
  const catalogo = leerJson(ARCHIVO_CATALOGO);
  const filtrado = catalogo.filter((t) => t.id_sync !== req.params.id_sync);
  guardarJson(ARCHIVO_CATALOGO, filtrado);
  res.json({ eliminado: true });
});

app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`Servidor de sincronización corriendo en el puerto ${PUERTO}`);
});