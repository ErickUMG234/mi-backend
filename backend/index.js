/* eslint-disable no-undef */

const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const path = require('path');


const multer = require('multer');


const app = express();
app.use(bodyParser.json());
app.use(express.json());




app.use((req, res, next) => {
   // console.log('Headers:', req.headers);
   // console.log('Body:', req.body);
    next();
});


const corsOptions = {
    origin: 'https://samayac-erick-ixcots-projects.vercel.app', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    allowedHeaders: ['Content-Type', 'Authorization'], 
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); 
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

const SECRET_KEY = process.env.SECRET_KEY;
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('DB_NAME:', process.env.DB_NAME);




const egresosRoutes = require('./routes/egresos');


app.use('/egresos', egresosRoutes);


const convertDateFormat = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${year}-${month}-${day}`;
};


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });
app.use('/uploads/', express.static(path.join(__dirname, 'uploads')));

// Función para registrar un usuario
 /* async function registerUser(nombre_usuario, email, password, id_rol) {
    try {
        await sql.connect(dbConfig);

        // Hashear la contraseña antes de almacenarla
        const hashedPassword = await bcrypt.hash(password, 10);

        const request = new sql.Request();
        request.input('nombre_usuario', sql.NVarChar, nombre_usuario);
        request.input('email', sql.NVarChar, email);
        request.input('password', sql.NVarChar, hashedPassword);
        request.input('id_rol', sql.Int, id_rol);
        request.input('fecha_creacion', sql.DateTime, new Date());

        const query = `
            INSERT INTO Usuario (nombre_usuario, email, Password, id_rol, Fecha_creacion) 
            VALUES (@nombre_usuario, @email, @password, @id_rol, @fecha_creacion)
        `;

        await request.query(query);
        console.log('Usuario registrado exitosamente');
    } catch (err) {
        console.error('Error al registrar el usuario:', err);
    }
}

// Llama a la función para registrar un usuario
registerUser('bodeguero2', 'bodeguero2@gmail.com', 'bodeguero123',1);*/



app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Intentando iniciar sesión con email: ${email}`);
    console.log('Datos enviados:', { email, password });
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        request.input('email', sql.NVarChar, email);

        const result = await request.query('SELECT * FROM Usuario WHERE email = @email');
        const user = result.recordset[0];

        if (!user) {
            console.log('Usuario no encontrado');
            return res.status(401).send('Usuario no encontrado');
        }
        console.log(`Usuario encontrado: ${user.nombre_usuario}`);
        console.log('Contraseña ingresada:', password);
        console.log('Contraseña hasheada almacenada:', user.Password);

      
        const validPassword = await bcrypt.compare(password, user.Password);
        console.log('Contraseña en texto plano:', password);  // Contraseña ingresada por el usuario
         console.log('Contraseña hasheada en la base de datos:', user.Password);  // Hash de la contraseña en la base de datos
        if (!validPassword) {
            console.log('Contraseña incorrecta');
            return res.status(401).send('Contraseña incorrecta');
        }

       
        const token = jwt.sign(
            { id: user.id_usuario, email: user.email, id_rol: user.id_rol },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        console.log('Token generado:', token); 
       
        
        return res.json({
            token,
            user: {
                id_usuario: user.id_usuario,
                nombre_usuario: user.nombre_usuario,
                email: user.email,
                id_rol: user.id_rol
            }
        });



    } catch (err) {
        console.error('Error en la solicitud:', err);
        res.status(500).send('Error en la solicitud');
    }
});



app.get('/me', (req, res) => {
    const token = req.headers.authorization.split(" ")[1]; // Extraer el token del header Authorization
    if (!token) {
        return res.status(401).send('No autorizado');
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        res.json({
            id_usuario: decoded.id,
            email: decoded.email,
            id_rol: decoded.id_rol
        });
    } catch (error) {
        res.status(401).send('Token inválido');
    }
});

app.get('/Materiales', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        const result = await request.query`SELECT * FROM Materiales`; // Consulta a la base de datos
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la solicitud');
    }
});

app.post('/Materiales',async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const { nombre_material, descripcion, unidades, Cantidad_disponible, fecha_registro} = req.body;
        if (!nombre_material || !descripcion || !unidades || !Cantidad_disponible || !fecha_registro ) {
            return res.status(403).send('Faltan datos necesarios para crear el material');
        }
        

                   
                   const formattedDate = convertDateFormat(fecha_registro);

        const query = `INSERT INTO Materiales (nombre_material, descripcion, unidades, Cantidad_disponible, fecha_registro) 
                       VALUES (@nombre_material, @descripcion, @unidades, @Cantidad_disponible, @fecha_registro)`;

                    
                       const request = new sql.Request();
                       request.input('nombre_material', sql.NVarChar, nombre_material);
                       request.input('descripcion', sql.NVarChar, descripcion);
                       request.input('unidades', sql.NVarChar, unidades);
                       request.input('Cantidad_disponible', sql.Int, Cantidad_disponible);
                       request.input('fecha_registro', sql.DateTime, new Date(fecha_registro));


                       
                       console.log({
                        nombre_material,
                        descripcion,
                        unidades,
                        Cantidad_disponible,
                        fecha_registro: formattedDate
                    });


        await request.query(query);
        res.status(201).send('Material creado exitosamente');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al crear el material');
    }
});





app.put('/Materiales/:id_material', async (req, res) => {
    console.log('Received request to update material:', req.body, req.params);
    const { id_material } = req.params;
    const { nombre_material, descripcion, unidades, Cantidad_disponible, fecha_registro } = req.body;

    console.log("Datos recibidos en backend:", req.body);

    
    if (!nombre_material || !descripcion || !unidades || !Cantidad_disponible || !fecha_registro) {
        return res.status(400).send('Todos los campos son obligatorios');
    }

  
 
         const formattedDate= convertDateFormat(fecha_registro);
    

    const query = `
        UPDATE Materiales 
        SET nombre_material = @nombre_material, 
            descripcion = @descripcion, 
            unidades = @unidades, 
            Cantidad_disponible = @Cantidad_disponible, 
            fecha_registro = @fecha_registro
        WHERE id_material = @id_material
    `;

    const request = new sql.Request();
    request.input('id_material', sql.Int, id_material);
    request.input('nombre_material', sql.NVarChar, nombre_material);
    request.input('descripcion', sql.NVarChar, descripcion);
    request.input('unidades', sql.NVarChar, unidades);
    request.input('Cantidad_disponible', sql.Int, Cantidad_disponible);
    request.input('fecha_registro', sql.DateTime, new Date(formattedDate));

    
                      
                       console.log({
                        nombre_material,
                        descripcion,
                        unidades,
                        Cantidad_disponible,
                        fecha_registro: formattedDate
                    });

    try {
        const result = await request.query(query);

       
        if (result.rowsAffected[0] === 0) {
            return res.status(409).send('Material no encontrado');
        }

        res.status(200).send('Material actualizado correctamente');
    } catch (error) {
        console.error(error);
        res.status(500).send('error al actualizar el material');
    }
});

app.delete('/Materiales/:id_material', async (req, res) => {
    const { id_material } = req.params; 

    try {
        await sql.connect(dbConfig); 
        const query = 'DELETE FROM Materiales WHERE id_material = @id_material'; 
        const request = new sql.Request();
        request.input('id_material', sql.Int, id_material); 

        const result = await request.query(query); 

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send('Material no encontrado'); 
        }

        res.status(200).send('Material eliminado correctamente'); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar el material'); 
    }
});



app.get('/Proveedores', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT * FROM Proveedores`; // Consulta a la base de datos
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la solicitud');
    }
});






app.delete('/Proveedores/:id_proveedor', async (req, res) => {
    const { id_proveedor } = req.params; 

    try {
        await sql.connect(dbConfig); // Conectar a la base de datos
        const query = 'DELETE FROM Proveedores WHERE id_proveedor = @id_proveedor'; 
        const request = new sql.Request();
        request.input('id_proveedor', sql.Int, id_proveedor); 

        const result = await request.query(query); 

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send('proveedor no encontrado'); 
        }

        res.status(200).send('proveedor eliminado correctamente'); 
    } catch (err) {
        console.error(err);
        res.status(500).send('proveedor al eliminar el material'); 
    }
});


app.put('/Proveedores/:id_proveedor', async (req, res) => {
    const { id_proveedor } = req.params;
    const { nombre_proveedor, contacto, direccion, telefono, email } = req.body;

    if (!nombre_proveedor || !contacto || !direccion || !telefono || !email) {
        return res.status(400).send('Todos los campos son obligatorios');
    }

    const query = `
        UPDATE Proveedores
        SET nombre_proveedor = @nombre_proveedor, 
            contacto = @contacto, 
            direccion = @direccion, 
            telefono = @telefono, 
            email = @email
        WHERE id_proveedor = @id_proveedor
    `;

    try {
       
        const request = new sql.Request();
        request.input('id_proveedor', sql.Int, id_proveedor);
        request.input('nombre_proveedor', sql.NVarChar, nombre_proveedor);
        request.input('contacto', sql.NVarChar, contacto);
        request.input('direccion', sql.NVarChar, direccion);
        request.input('telefono', sql.NVarChar, telefono); 
        request.input('email', sql.NVarChar, email);

        const result = await pool.request().query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(409).send('Proveedor no encontrado');
        }

        res.status(200).send('Proveedor actualizado correctamente');
    } catch (error) {
        console.error(error);
        res.status(500).send('ERROR al actualizar el Proveedor');
    }
});



app.post('/Proveedores', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const { nombre_proveedor, contacto, direccion, telefono, email } = req.body;
        
        if (!nombre_proveedor || !contacto || !direccion || !telefono || !email) {
            return res.status(403).send('Faltan datos necesarios para crear el proveedor');
        }

        const query = `
            INSERT INTO Proveedores (nombre_proveedor, contacto, direccion, telefono, email)
            VALUES (@nombre_proveedor, @contacto, @direccion, @telefono, @email)
        `;

        const request = new sql.Request();
        request.input('nombre_proveedor', sql.NVarChar, nombre_proveedor);
        request.input('contacto', sql.NVarChar, contacto);
        request.input('direccion', sql.NVarChar, direccion);
        request.input('telefono', sql.NVarChar, telefono);
        request.input('email', sql.NVarChar, email);

        
        console.log({
            nombre_proveedor,
            contacto,
            direccion,
            telefono,
            email
        });

        await request.query(query);
        res.status(201).send('Proveedor creado exitosamente');
    } catch (err) {
        console.error('Error al crear el proveedor:', err);
        res.status(500).send('Error al crear el proveedor');
    }
});

app.get('/Usuarios', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT * FROM Usuario`; // Consulta a la base de datos
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la solicitud');
    }
});




app.post('/Ingresos', upload.single('solicitud_recibido'), async (req, res) => {
    try {
        await sql.connect(dbConfig);
        
        const { descripcion, proveedor_materiales } = req.body;  // `proveedor_materiales` debe ser un array de objetos con id_material, id_proveedor, cantidad_ingresada
        const solicitud_recibido = req.file ? req.file.filename : null;  // El archivo recibido (si existe)
        const id_usuario = req.body.id_usuario;  // El ID del usuario autenticado que creó el ingreso
        
        if (!descripcion || !id_usuario || !proveedor_materiales || proveedor_materiales.length === 0) {
            return res.status(403).send('Faltan datos necesarios para crear la solicitud de ingreso');
        }

       
        const requestAprobacion = new sql.Request();
        requestAprobacion.input('descripcion', sql.VarChar, descripcion);
        requestAprobacion.input('solicitud_recibido', sql.NVarChar(sql.MAX), solicitud_recibido);
        const resultAprobacion = await requestAprobacion.query('INSERT INTO Aprobaciones (descripcion, solicitud_recibido) OUTPUT inserted.id_aprobacion VALUES (@descripcion, @solicitud_recibido)');
        const id_aprobacion = resultAprobacion.recordset[0].id_aprobacion;

        
        for (const ingreso of JSON.parse(proveedor_materiales)) {
            const { id_material, id_proveedor, cantidad_ingresada, fecha_ingreso } = ingreso;

         
            const requestIngreso = new sql.Request();
            requestIngreso.input('id_proveedor', sql.Int, id_proveedor);
            requestIngreso.input('id_aprobacion', sql.Int, id_aprobacion);
            requestIngreso.input('cantidad_ingreso', sql.Int, cantidad_ingresada);
            requestIngreso.input('id_usuario', sql.Int, id_usuario);
            requestIngreso.input('fecha_ingreso', sql.DateTime, new Date(fecha_ingreso));
            const resultIngreso = await requestIngreso.query('INSERT INTO Ingresos (id_proveedor, id_aprobacion, cantidad_ingreso, id_usuario, fecha_ingreso) OUTPUT inserted.id_ingreso VALUES (@id_proveedor, @id_aprobacion, @cantidad_ingreso, @id_usuario, @fecha_ingreso)');
            const id_ingreso = resultIngreso.recordset[0].id_ingreso;

            // Relacionar el ingreso con el material
            const requestIngresoMaterial = new sql.Request();
            requestIngresoMaterial.input('id_material', sql.Int, id_material);
            requestIngresoMaterial.input('id_ingreso', sql.Int, id_ingreso);
            await requestIngresoMaterial.query('INSERT INTO Ingreso_Material (id_material, id_ingreso) VALUES (@id_material, @id_ingreso)');
        }

        res.status(201).json({ message: 'Ingreso registrado exitosamente' });
    } catch (err) {
        console.error("Error creando los ingresos:", err);
        res.status(500).send('Error al registrar los ingresos');
    }
});




app.get('/Ingresos', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query(`
            SELECT 
                I.id_ingreso, 
                M.nombre_material, 
                P.nombre_proveedor, 
                I.cantidad_ingreso,  
                I.fecha_ingreso, 
                U.nombre_usuario, 
                A.solicitud_recibido 
            FROM Ingresos I
            INNER JOIN Ingreso_Material IM ON I.id_ingreso = IM.id_ingreso
            INNER JOIN Materiales M ON IM.id_material = M.id_material
            INNER JOIN Proveedores P ON I.id_proveedor = P.id_proveedor
            INNER JOIN Usuario U ON I.id_usuario = U.id_usuario
            INNER JOIN Aprobaciones A ON I.id_aprobacion = A.id_aprobacion
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los ingresos');
    }
});

app.get('/egreso', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query(`
            SELECT 
                E.id_egreso, 
                M.nombre_material, 
                E.cantidad_egresada AS cantidad_egreso, 
                (SELECT SUM(I.cantidad_ingreso) 
                 FROM Ingreso_Material IM 
                 INNER JOIN Ingresos I ON IM.id_ingreso = I.id_ingreso 
                 WHERE IM.id_material = M.id_material) AS cantidad_ingreso, 
                ((SELECT SUM(I.cantidad_ingreso) 
                  FROM Ingreso_Material IM 
                  INNER JOIN Ingresos I ON IM.id_ingreso = I.id_ingreso 
                  WHERE IM.id_material = M.id_material) -
                 (SELECT SUM(E2.cantidad_egresada) 
                  FROM Egreso_Material EM2 
                  INNER JOIN Egresos E2 ON EM2.id_egreso = E2.id_egreso 
                  WHERE EM2.id_material = M.id_material)) AS cantidad_en_stock,
                EA.solicitud_aprobada AS solicitud_documento,
                E.fecha_egreso
            FROM Egresos E
            INNER JOIN Egreso_Material EM ON E.id_egreso = EM.id_egreso
            INNER JOIN Materiales M ON EM.id_material = M.id_material
            INNER JOIN egreso_aprobado EA ON E.id_egresoaprobado = EA.id_egresoaprobado
            ORDER BY E.fecha_egreso DESC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener la información de los egresos.');
    }
});









//Conexion a la base de datos para Proveedores
//______________________________________________________________

app.get('/Proveedores', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT * FROM Proveedores`; // Consulta a la base de datos
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la solicitud');
    }
});





//Conexion a la base de datos para Eliminacion de Proveedores
//______________________________________________________________

// Eliminar un Proveedor existente
app.delete('/Proveedores/:id_proveedor', async (req, res) => {
    const { id_proveedor } = req.params; 

    try {
        await sql.connect(dbConfig); // Conectar a la base de datos
        const query = 'DELETE FROM Proveedores WHERE id_proveedor = @id_proveedor'; 
        const request = new sql.Request();
        request.input('id_proveedor', sql.Int, id_proveedor); 

        const result = await request.query(query); 

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send('proveedor no encontrado'); 
        }

        res.status(200).send('proveedor eliminado correctamente'); 
    } catch (err) {
        console.error(err);
        res.status(500).send('proveedor al eliminar el material'); 
    }
});

//Conexion a la base de datos para actualizar los Proveedores
//______________________________________________________________

// Actualizar un proveedor existente
app.put('/Proveedores/:id_proveedor', async (req, res) => {
    const { id_proveedor } = req.params;
    const { nombre_proveedor, contacto, direccion, telefono, email } = req.body;

    if (!nombre_proveedor || !contacto || !direccion || !telefono || !email) {
        return res.status(400).send('Todos los campos son obligatorios');
    }

    const query = `
        UPDATE Proveedores
        SET nombre_proveedor = @nombre_proveedor, 
            contacto = @contacto, 
            direccion = @direccion, 
            telefono = @telefono, 
            email = @email
        WHERE id_proveedor = @id_proveedor
    `;

    try {
       
        const request = new sql.Request();
        request.input('id_proveedor', sql.Int, id_proveedor);
        request.input('nombre_proveedor', sql.NVarChar, nombre_proveedor);
        request.input('contacto', sql.NVarChar, contacto);
        request.input('direccion', sql.NVarChar, direccion);
        request.input('telefono', sql.NVarChar, telefono); 
        request.input('email', sql.NVarChar, email);

        const result = await pool.request().query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(409).send('Proveedor no encontrado');
        }

        res.status(200).send('Proveedor actualizado correctamente');
    } catch (error) {
        console.error(error);
        res.status(500).send('ERROR al actualizar el Proveedor');
    }
});


//Conexion a la base de datos para ingresar Proveedores
//______________________________________________________________
// Insertar nuevos datos en la tabla Proveedores
app.post('/create/Proveedores', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const { nombre_proveedor, contacto, direccion, telefono, email } = req.body;
        
        if (!nombre_proveedor || !contacto || !direccion || !telefono || !email) {
            return res.status(403).send('Faltan datos necesarios para crear el proveedor');
        }

        const query = `
            INSERT INTO Proveedores (nombre_proveedor, contacto, direccion, telefono, email)
            VALUES (@nombre_proveedor, @contacto, @direccion, @telefono, @email)
        `;

        const request = new sql.Request();
        request.input('nombre_proveedor', sql.NVarChar, nombre_proveedor);
        request.input('contacto', sql.NVarChar, contacto);
        request.input('direccion', sql.NVarChar, direccion);
        request.input('telefono', sql.NVarChar, telefono);
        request.input('email', sql.NVarChar, email);

        // Me ayuda a ver qué datos estoy enviando al servidor
        console.log({
            nombre_proveedor,
            contacto,
            direccion,
            telefono,
            email
        });

        await request.query(query);
        res.status(201).send('Proveedor creado exitosamente');
    } catch (err) {
        console.error('Error al crear el proveedor:', err);
        res.status(500).send('Error al crear el proveedor');
    }
});

app.get('/Usuarios', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT * FROM Usuario`; // Consulta a la base de datos
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la solicitud');
    }
});



//Conexion a la base de datos para ingresar los ingresos
//______________________________________________________________
// Insertar nuevos datos en la tabla Ingresos
app.post('/create/Ingresos', upload.single('solicitud_recibido'), async (req, res) => {
    try {
        await sql.connect(dbConfig);
        console.log('Datos recibidos en el cuerpo de la solicitud:', req.body);
        console.log('Archivo recibido:', req.file);
        const { id_material, id_proveedor, cantidad_ingresada, fecha_ingreso, id_usuario } = req.body;
        const solicitud_recibido = req.file ? req.file.filename : null;
        
        if (!id_material || !id_proveedor || !cantidad_ingresada || !fecha_ingreso || !id_usuario) {
            console.log('Faltan datos requeridos para registrar el ingreso');
            return res.status(403).send('Faltan datos necesarios para crear el ingreso');
        }
        //const formattedDate= convertDateFormat(fecha_ingreso);
    
        const query = `INSERT INTO Ingresos (id_material, id_proveedor, cantidad_ingresada, fecha_ingreso, id_usuario, solicitud_recibido) 
                       VALUES (@id_material, @id_proveedor, @cantidad_ingresada, @fecha_ingreso, @id_usuario, @solicitud_recibido)`;

        const request = new sql.Request();
        request.input('id_material', sql.Int, id_material);
        request.input('id_proveedor', sql.Int, id_proveedor);
        request.input('cantidad_ingresada', sql.Int, cantidad_ingresada);
        request.input('fecha_ingreso', sql.DateTime, new Date(fecha_ingreso));
        request.input('id_usuario', sql.Int, id_usuario);
        request.input('solicitud_recibido', sql.NVarChar(sql.MAX), solicitud_recibido);

        console.log({
            id_material,
            id_proveedor,
           cantidad_ingresada,
           fecha_ingreso,
           id_usuario,
           solicitud_recibido
       });
       

        await request.query(query);
        res.status(201).send('Ingreso registrado exitosamente');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al registrar el ingreso');
    }
});




app.get('/Ingresos', async (req, res) => {
    try {
        await sql.connect(dbConfig);

        const result = await sql.query(`
            SELECT 
                i.id_ingreso, 
                m.nombre_material, 
                p.nombre_proveedor, 
                u.nombre_usuario, 
                i.cantidad_ingresada, 
                i.fecha_ingreso, 
                i.solicitud_recibido
            FROM 
                Ingresos i
            JOIN 
                Materiales m ON i.id_material = m.id_material
            JOIN 
                Proveedores p ON i.id_proveedor = p.id_proveedor
            JOIN 
                Usuario u ON i.id_usuario = u.id_usuario;
        `);

        res.status(200).json(result.recordset);
        console.log('datos obtenidos', req.body);
    } catch (error) {
        console.error('Error al obtener los ingresos:', error);
        res.status(500).send('Error al obtener los ingresos');
    }

    
});

app.get('/egresos', async (req, res) => {
    try {
        // Conexión a la base de datos
        await sql.connect(dbConfig);

        // Consulta SQL
        const query = `
            SELECT 
                e.id_egreso,
                m.nombre_material,
                i.cantidad_ingresada,
                e.cantidad_egresada,
                e.fecha_egreso,
                u.nombre_solicitante,
                u.area_solicitante
            FROM 
                Egresos e
            JOIN 
                Materiales m ON e.id_material = m.id_material
            JOIN 
                Ubicacion u ON e.id_ubicacion = u.id_ubicacion
            LEFT JOIN
                Ingresos i ON e.id_material = i.id_material;
        `;

        // Ejecutar la consulta
        const result = await sql.query(query);

        // Devolver los datos en formato JSON
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener los detalles de los egresos:', err);
        res.status(500).send('Error al obtener los detalles de los egresos');
    }
});







// Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));






