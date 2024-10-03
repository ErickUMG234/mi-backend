/* eslint-disable no-undef */

const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
require('dotenv').config();

//const SECRET_KEY = 'your_secret_key';
const multer = require('multer');


const app = express();
app.use(bodyParser.json());
app.use(express.json());




// Middleware para depuración
app.use((req, res, next) => {
   // console.log('Headers:', req.headers);
   // console.log('Body:', req.body);
    next();
});


const corsOptions = {
    origin: 'https://samayac-erick-ixcots-projects.vercel.app', // Reemplaza esto con la URL de tu frontend en Vercel
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); // Aplica CORS a todas las rutas

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


  

  

// Configuración de la base de datos SmarterASP
/*const dbConfig = {
    user: 'db_aad8c4_bdsamayac_admin',
    password: 'erick123',
    server: 'sql8005.site4now.net', // dirección de tu servidor SQL Server
    database: 'BDSamayac',
    options: {
        encrypt: true, // Usa true si estás en Azure, de lo contrario false
        trustServerCertificate: true // solo en desarrollo
    }
};*/

// Configuración de la base de datos SQL Server
/*const dbConfig = {
    user: 'db_aad8c4_bdsamayac_admin',
    password: 'erick123',
    server: 'sql8005.site4now.net', // dirección de tu servidor SQL Server
    database: 'BDSamayac',
    options: {
        encrypt: true, // Usa true si estás en Azure, de lo contrario false
        trustServerCertificate: true // solo en desarrollo
    }
};*/

// Importar las rutas de egresos
const egresosRoutes = require('./routes/egresos');

// Usar las rutas de egresos
app.use('/egresos', egresosRoutes);

// Función para convertir la fecha de yyyy-MM-dd a un formato aceptable para SQL Server
const convertDateFormat = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${year}-${month}-${day}`;
};

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


// Función para registrar un usuario
/*async function registerUser(nombre_usuario, email, password, id_rol) {
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
registerUser('bodeguero', 'bodeguero@gmail.com', 'bodeguero789');*/


//LOGIN
//____________________________________________________________________
// **Ruta de login**
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

        // Verificar la contraseña hasheada
        const validPassword = await bcrypt.compare(password, user.Password);
        if (!validPassword) {
            console.log('Contraseña incorrecta');
            return res.status(401).send('Contraseña incorrecta');
        }

        // Generar un token JWT
        const token = jwt.sign(
            { id: user.id_usuario, email: user.email, id_rol: user.id_rol },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        console.log('Token generado:', token); 
       
        // Devolver el token y los datos del usuario
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


// Ruta para obtener la información del usuario autenticado
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


/*const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).send('Token no proporcionado');
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send('Token inválido');
        }
        req.userId = decoded.id;
        next();
    });
};*/

//Conexion a la base de datos para mostrar en pantalla
//______________________________________________________________
// Conectar a la base de datos y obtener datos
app.get('/Materiales', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        const result = await request().query`SELECT * FROM Materiales`; // Consulta a la base de datos
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la solicitud');
    }
});


//Conexion a la base de datos para ingresar Materiales
//______________________________________________________________
// Insertar nuevos datos en la tabla Materiales
app.post('/Materiales',async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const { nombre_material, descripcion, unidades, Cantidad_disponible, fecha_registro} = req.body;
        if (!nombre_material || !descripcion || !unidades || !Cantidad_disponible || !fecha_registro ) {
            return res.status(403).send('Faltan datos necesarios para crear el material');
        }
        
      // Conversión de la fecha al formato adecuado
                   
                   const formattedDate = convertDateFormat(fecha_registro);

        const query = `INSERT INTO Materiales (nombre_material, descripcion, unidades, Cantidad_disponible, fecha_registro) 
                       VALUES (@nombre_material, @descripcion, @unidades, @Cantidad_disponible, @fecha_registro)`;

                    
                       const request = new sql.Request();
                       request.input('nombre_material', sql.NVarChar, nombre_material);
                       request.input('descripcion', sql.NVarChar, descripcion);
                       request.input('unidades', sql.NVarChar, unidades);
                       request.input('Cantidad_disponible', sql.Int, Cantidad_disponible);
                       request.input('fecha_registro', sql.DateTime, new Date(fecha_registro));


                       //Me ayuda a ver que datos estoy enviando al servidor
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




//Conexion a la base de datos para actualizar los Materiales
//______________________________________________________________

// Actualizar un material existente
app.put('/Materiales/:id_material', async (req, res) => {
    console.log('Received request to update material:', req.body, req.params);
    const { id_material } = req.params;
    const { nombre_material, descripcion, unidades, Cantidad_disponible, fecha_registro } = req.body;

    console.log("Datos recibidos en backend:", req.body);

    // Validación adicional para fecha_registro
    if (!nombre_material || !descripcion || !unidades || !Cantidad_disponible || !fecha_registro) {
        return res.status(400).send('Todos los campos son obligatorios');
    }

    // Convertir la fecha si está presente
 
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

    
                       //Me ayuda a ver que datos estoy enviando al servidor
                       console.log({
                        nombre_material,
                        descripcion,
                        unidades,
                        Cantidad_disponible,
                        fecha_registro: formattedDate
                    });

    try {
        const result = await request.query(query);

        // Verificar si el material fue actualizado
        if (result.rowsAffected[0] === 0) {
            return res.status(409).send('Material no encontrado');
        }

        res.status(200).send('Material actualizado correctamente');
    } catch (error) {
        console.error(error);
        res.status(500).send('error al actualizar el material');
    }
});


//Conexion a la base de datos para Eliminacion de Materiales
//______________________________________________________________

// Eliminar un material existente
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
app.post('/Ingresos', upload.single('solicitud_recibido'), async (req, res) => {
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
app.post('/Ingresos', upload.single('solicitud_recibido'), async (req, res) => {
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





/*const express = require('express');
const cors = require('cors');
const sql = require('mssql');


const app = express();
app.use(cors()); // Habilita CORS para que React pueda comunicarse con el backend

app.use(express.json());



// Middleware para depuración
app.use((req, res, next) => {
   // console.log('Headers:', req.headers);
   // console.log('Body:', req.body);
    next();
});


const corsOptions = {
    origin: 'http://localhost:5173', // Permitir solo solicitudes desde Vite
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); // Aplica CORS a todas las rutas

// Configuración de la base de datos SQL Server
const dbConfig = {
    user: 'sa',
    password: 'erick123',
    server: 'DESKTOP-SG90P1Q', // dirección de tu servidor SQL Server
    database: 'BDSamayac',
    options: {
        encrypt: true, // Usa true si estás en Azure, de lo contrario false
        trustServerCertificate: true // solo en desarrollo
    }
};

// Función para convertir la fecha de yyyy-MM-dd a un formato aceptable para SQL Server
const convertDateFormat = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${year}-${month}-${day}`;
};






// Conectar a la base de datos y obtener datos
app.get('/Materiales', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT * FROM Materiales`; // Consulta a la base de datos
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en la solicitud');
    }
});

// Insertar nuevos datos en la tabla Materiales
app.post('/Materiales', async (req, res) => {
    try {
        await sql.connect(dbConfig);
        const { nombre_material, descripcion, unidades, Cantidad_disponible, fecha_registro} = req.body;
        if (!nombre_material || !descripcion || !unidades || !Cantidad_disponible || !fecha_registro ) {
            return res.status(403).send('Faltan datos necesarios para crear el material');
        }
        
      // Conversión de la fecha al formato adecuado
                   
                   const formattedDate = convertDateFormat(fecha_registro);

        const query = `INSERT INTO Materiales (nombre_material, descripcion, unidades, Cantidad_disponible, fecha_registro) 
                       VALUES (@nombre_material, @descripcion, @unidades, @Cantidad_disponible, @fecha_registro)`;

                       const request = new sql.Request();
                       request.input('nombre_material', sql.NVarChar, nombre_material);
                       request.input('descripcion', sql.NVarChar, descripcion);
                       request.input('unidades', sql.NVarChar, unidades);
                       request.input('Cantidad_disponible', sql.Int, Cantidad_disponible);
                       request.input('fecha_registro', sql.DateTime, new Date(fecha_registro));


                       //Me ayuda a ver que datos estoy enviando al servidor
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






// Actualizar un material existente
app.put('/Materiales/:id_material', async (req, res) => {
    console.log('Received request to update material:', req.body, req.params);
    const { id_material } = req.params;
    const { nombre_material, descripcion, unidades, Cantidad_disponible, fecha_registro } = req.body;

    console.log("Datos recibidos en backend:", req.body);

    // Validación adicional para fecha_registro
    if (!nombre_material || !descripcion || !unidades || !Cantidad_disponible || !fecha_registro) {
        return res.status(400).send('Todos los campos son obligatorios');
    }

    // Convertir la fecha si está presente
 
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

    
                       //Me ayuda a ver que datos estoy enviando al servidor
                       console.log({
                        nombre_material,
                        descripcion,
                        unidades,
                        Cantidad_disponible,
                        fecha_registro: formattedDate
                    });

    try {
        const result = await request.query(query);

        // Verificar si el material fue actualizado
        if (result.rowsAffected[0] === 0) {
            return res.status(409).send('Material no encontrado');
        }

        res.status(200).send('Material actualizado correctamente');
    } catch (error) {
        console.error(error);
        res.status(500).send('error al actualizar el material');
    }
});




// Eliminar un material existente
app.delete('/Materiales/:id_material', async (req, res) => {
    const { id_material } = req.params; // Obtener el id_material de los parámetros de la solicitud

    try {
        await sql.connect(dbConfig); // Conectar a la base de datos
        const query = 'DELETE FROM Materiales WHERE id_material = @id_material'; // Consulta SQL para eliminar
        const request = new sql.Request();
        request.input('id_material', sql.Int, id_material); // Vincular el id_material al parámetro

        const result = await request.query(query); // Ejecutar la consulta SQL

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send('Material no encontrado'); // Manejar caso en que el material no existe
        }

        res.status(200).send('Material eliminado correctamente'); // Respuesta de éxito
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar el material'); // Manejar errores
    }
});


// Inicia el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));*/
