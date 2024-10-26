/* eslint-disable no-undef */
const express = require('express');
const multer = require('multer');
const sql = require('mssql');

const router = express.Router();


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const dbConfig = {
    user: 'db_aad8c4_bdsamayac_admin',
    password: 'erick123',
    server: 'sql8005.site4now.net',
    database: 'db_aad8c4_bdsamayac',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

// Ruta para manejar la creación de registros en Ubicación y Egresos
router.post('/', upload.single('solicitud_aprobada'), async (req, res) => {
    try {
        console.log('Datos recibidos del frontend:', req.body);

        await sql.connect(dbConfig);

      
        const materiales = JSON.parse(req.body.materiales);  // Aquí conviertes la cadena a array
        console.log('Materiales procesados:', materiales);

        const { fecha_egreso, nombre_ubicacion, descripcion, nombre_solicitante, area_solicitante, fecha_solicitada } = req.body;
        const solicitud_aprobada = req.file ? req.file.filename : null;

       
        if (!fecha_egreso || !nombre_ubicacion || !descripcion || !nombre_solicitante || !area_solicitante || !materiales.length) {
            return res.status(400).send('Faltan campos requeridos o materiales no válidos');
        }

     
        const resultUbicacion = await new sql.Request()
            .input('nombre_ubicacion', sql.NVarChar, nombre_ubicacion)
            .input('descripcion', sql.NVarChar, descripcion)
            .input('nombre_solicitante', sql.NVarChar, nombre_solicitante)
            .input('area_solicitante', sql.NVarChar, area_solicitante)
            .input('fecha_solicitada', sql.DateTime, new Date(fecha_solicitada))
            .query(`
                INSERT INTO Ubicacion (nombre_ubicacion, descripcion, nombre_solicitante, area_solicitante, fecha_solicitada)
                OUTPUT INSERTED.id_ubicacion
                VALUES (@nombre_ubicacion, @descripcion, @nombre_solicitante, @area_solicitante, @fecha_solicitada)
            `);
        const id_ubicacion = resultUbicacion.recordset[0].id_ubicacion;
        console.log('ID de la Ubicación insertada:', id_ubicacion);

        
        const resultEgresoAprobado = await new sql.Request()
            .input('descripcion', sql.NVarChar, descripcion)
            .input('solicitud_aprobada', sql.NVarChar, solicitud_aprobada)
            .query(`
                INSERT INTO egreso_aprobado (descripcion, solicitud_aprobada)
                OUTPUT INSERTED.id_egresoaprobado
                VALUES (@descripcion, @solicitud_aprobada)
            `);
        const id_egresoaprobado = resultEgresoAprobado.recordset[0].id_egresoaprobado;
        console.log('ID del egreso aprobado insertado:', id_egresoaprobado);

        
        for (const material of materiales) {
            const cantidadEgresada = Number(material.cantidad_egresada);  
            if (!material.cantidad_egresada || isNaN(material.cantidad_egresada)) {
                return res.status(400).send('La cantidad egresada es requerida y debe ser un número.');
            }

            
            const resultEgreso = await new sql.Request()
                .input('id_ubicacion', sql.Int, id_ubicacion)
                .input('id_egresoaprobado', sql.Int, id_egresoaprobado)
                .input('cantidad_egresada', sql.Int, material.cantidad_egresada)  // Aquí tomas la cantidad de cada material
                .input('fecha_egreso', sql.DateTime, new Date(fecha_egreso))
                .query(`
                    INSERT INTO Egresos (id_ubicacion, id_egresoaprobado, cantidad_egresada, fecha_egreso)
                    OUTPUT INSERTED.id_egreso
                    VALUES (@id_ubicacion, @id_egresoaprobado, @cantidad_egresada, @fecha_egreso)
                `);
            const id_egreso = resultEgreso.recordset[0].id_egreso;
            console.log('ID del egreso insertado:', id_egreso);

            
            const request = new sql.Request();
            await request
                .input('id_material', sql.Int, material.id_material)
                .input('id_egreso', sql.Int, id_egreso)
                .query(`
                    INSERT INTO Egreso_Material (id_material, id_egreso)
                    VALUES (@id_material, @id_egreso)
                `);
            console.log('Material insertado en la tabla Egreso:', material);
            if (isNaN(cantidadEgresada)) {
                console.log('Cantidad egresada no válida:', material.cantidad_egresada);
                return res.status(400).send('La cantidad egresada debe ser un número válido.');
            }
        }

        res.status(201).send('Egreso creado exitosamente');
    } catch (err) {
        console.error('Error en la creación del egreso:', err);
        res.status(500).send('Error al crear el egreso');
    }
});

module.exports = router;
