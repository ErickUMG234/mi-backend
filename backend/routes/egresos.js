/* eslint-disable no-undef */
const express = require('express');
const multer = require('multer');
const sql = require('mssql');

const router = express.Router();

// Configuración de multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Configuración de la base de datos SQL Server
const dbConfig = {
    user: 'sa',
    password: 'erick123',
    server: 'DESKTOP-SG90P1Q',
    database: 'BDSamayac',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

// Ruta para manejar la creación de registros en Ubicación y Egresos
router.post('/', upload.single('solicitud_aprobada'), async (req, res) => {
    const { nombre_ubicacion, descripcion, nombre_solicitante, area_solicitante, fecha_solicitada } = req.body;
    const { id_material, cantidad_egresada, fecha_egreso } = req.body;

    try {
        await sql.connect(dbConfig);
        const transaction = new sql.Transaction();

        await transaction.begin();

        try {
            const requestUbicacion = new sql.Request(transaction);
            requestUbicacion.input('nombre_ubicacion', sql.NVarChar, nombre_ubicacion);
            requestUbicacion.input('descripcion', sql.NVarChar, descripcion);
            requestUbicacion.input('nombre_solicitante', sql.NVarChar, nombre_solicitante);
            requestUbicacion.input('area_solicitante', sql.NVarChar, area_solicitante);
            requestUbicacion.input('fecha_solicitada', sql.DateTime, fecha_solicitada);
            

            const resultUbicacion = await requestUbicacion.query(`
                INSERT INTO Ubicacion (nombre_ubicacion, descripcion, nombre_solicitante, area_solicitante, fecha_solicitada) 
                OUTPUT INSERTED.id_ubicacion 
                VALUES (@nombre_ubicacion, @descripcion, @nombre_solicitante, @area_solicitante, @fecha_solicitada)
            `);

            const id_ubicacion = resultUbicacion.recordset[0].id_ubicacion;

            let solicitud_aprobada = null;
            if (req.file) {
                solicitud_aprobada = req.file.filename;
            }

            const requestEgresos = new sql.Request(transaction);
            requestEgresos.input('id_material', sql.Int, id_material);
            requestEgresos.input('cantidad_egresada', sql.Int, cantidad_egresada);
            requestEgresos.input('fecha_egreso', sql.DateTime, fecha_egreso);
            requestEgresos.input('id_ubicacion', sql.Int, id_ubicacion);
            requestEgresos.input('solicitud_aprobada', sql.NVarChar, solicitud_aprobada);

            await requestEgresos.query(`
                INSERT INTO Egresos (id_material, cantidad_egresada, fecha_egreso, id_ubicacion, solicitud_aprobada) 
                VALUES (@id_material, @cantidad_egresada, @fecha_egreso, @id_ubicacion, @solicitud_aprobada)
            `);

            await transaction.commit();
            res.status(201).json({ message: 'Egreso y ubicación creados exitosamente.' });
        } catch (err) {
            await transaction.rollback();
            console.error('Error durante la transacción:', err);
            res.status(500).json({ error: 'Hubo un error al crear el egreso y la ubicación.' });
        }
    } catch (err) {
        console.error('Error de conexión o en la transacción:', err);
        res.status(500).json({ error: 'Error en la solicitud.' });
    }
});

module.exports = router;
