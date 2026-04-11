/* ==========================================
   1. VARIABLES DE ESTADO Y ELEMENTOS DEL DOM
   ========================================== */
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.getElementById('menuToggle');
const overlay = document.getElementById('sidebarOverlay');
const listaContenedor = document.getElementById('listaClientes');
const contadorTexto = document.getElementById('contadorClientes');

//CAMBIAR TEMA (COLORES)
const btnTema = document.getElementById('btn-tema');
const temaIcon = document.getElementById('tema-icon');
const sunIcon = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
const moonIcon = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;


// Modales
const modalNuevo = document.getElementById('modalNuevoCliente');
const modalCobro = document.getElementById('modalCobrarCuota');

// Botones Abrir/Cerrar
const btnAbrirNuevo = document.getElementById('abrirModalNuevo');
const btnCerrarNuevoX = document.getElementById('btnCerrarX');
const btnCancelarNuevo = document.getElementById('btnCancelarModal');
const btnCerrarCobroX = document.getElementById('btnCerrarCobro');

// Botón Guardar (Lógica Principal)
const btnGuardarCliente = document.getElementById('btnGuardarCliente');

// Lógica de Cobro
const displayCant = document.getElementById('cantidadCuotas');
const displayMontoFinal = document.getElementById('montoFinalPagar');
const btnMas = document.getElementById('btnMas');
const btnMenos = document.getElementById('btnMenos');
const modalOtorgar = document.getElementById('modalOtorgar');

//cobra cuota
let clienteSeleccionado = null; // Guardará al cliente al que le estamos cobrando
let cuotasAPagar = 1;
const VALOR_CUOTA_ESTANDAR = 13000; // Puedes cambiar esto según tu lógica

//editar cliente
let clienteEnEdicion = null; // Variable para saber a quién editamos


let cuotasSeleccionadas = 1;
const VALOR_CUOTA_BASE = 13000; 


//------------------------------------------------------------------------
//TEMAAAAAAAAAA
// Verificar preferencia guardada
if (localStorage.getItem('tema') === 'oscuro') {
    document.body.classList.add('tema-oscuro');
    temaIcon.innerHTML = sunIcon;
}

btnTema.addEventListener('click', () => {
    document.body.classList.toggle('tema-oscuro');
    const isDark = document.body.classList.contains('tema-oscuro');
    
    // Cambiar icono y guardar preferencia
    temaIcon.innerHTML = isDark ? sunIcon : moonIcon;
    localStorage.setItem('tema', isDark ? 'oscuro' : 'claro');
});
//------------------------------------------------------------------------


// Base de datos inicial
let clientes = [
    { 
        id: 2, 
        nombre: "Enzo Suarez", 
        monto: 0, 
        estado: "sin prestamo", // <--- Coincide con status-sin-prestamo
        iniciales: "ES", 
        color: "var(--avatar-naranja)",
        dni: "35444123",
        tel: "+5491144556677",
        direccion: "Santa Fe 123",
        ocupacion: "Comerciante",
        cuotas: "0/0"
    },
    { 
        id: 2, 
        nombre: "Teo Delia", 
        monto: 0, 
        estado: "Al dia", // <--- Coincide con status-sin-prestamo
        iniciales: "ES", 
        color: "var(--avatar-naranja)",
        dni: "35444123",
        tel: "+5491144556677",
        direccion: "Santa Fe 123",
        ocupacion: "Comerciante",
        cuotas: "0/0"
    },  
    { 
        id: 1, 
        nombre: "Rodrigo Lugón", 
        monto: 65000, 
        estado: "Al dia",  // <--- Coincide con badge-atrasado y status-atrasado
        iniciales: "RL", 
        color: "var(--avatar-violeta)",
        dni: "29870555",
        tel: "+5491178901234",
        direccion: "Salta, Alberdi, Belgrano 654",
        ocupacion: "Albañil",
        cuotas: "1/6"
    },
    { 
        id: 2, 
        nombre: "Enzo Suarez", 
        monto: 600, 
        estado: "atrasado", // <--- Coincide con status-sin-prestamo
        iniciales: "ES", 
        color: "var(--avatar-naranja)",
        dni: "35444123",
        tel: "+5491144556677",
        direccion: "Santa Fe 123",
        ocupacion: "Comerciante",
        cuotas: "2/6"
    },
    { 
        id: 2, 
        nombre: "Davoo Xeneize", 
        monto: 0, 
        estado: "finalizado", // <--- Coincide con status-sin-prestamo
        iniciales: "ES", 
        color: "var(--avatar-naranja)",
        dni: "35444123",
        tel: "+5491144556677",
        direccion: "Santa Fe 123",
        ocupacion: "Comerciante",
        cuotas: "7/7"
    },
    { 
        id: 2, 
        nombre: "Gaston Ferrante", 
        monto: 650, 
        estado: "atrasado", // <--- Coincide con status-sin-prestamo
        iniciales: "ES", 
        color: "var(--avatar-naranja)",
        dni: "35444123",
        tel: "+5491144556677",
        direccion: "Santa Fe 123",
        ocupacion: "Comerciante",
        cuotas: "0/0"
    },
        { 
        id: 2, 
        nombre: "Pollo Vignolo", 
        monto: 0, 
        estado: "al dia", // <--- Coincide con status-sin-prestamo
        iniciales: "ES", 
        color: "var(--avatar-naranja)",
        dni: "35444123",
        tel: "+5491144556677",
        direccion: "Santa Fe 123",
        ocupacion: "Comerciante",
        cuotas: "0/0"
    }
];

/* ==========================================
   2. LÓGICA DEL SIDEBAR (MENÚ)
   ========================================== */
const abrirMenu = () => { sidebar.classList.add('open'); overlay.classList.add('active'); };
const cerrarMenu = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); };

menuToggle.onclick = abrirMenu;
overlay.onclick = cerrarMenu;



// Función para obtener las iniciales del Nombre y Apellido
function obtenerIniciales(nombreCompleto) {
    if (!nombreCompleto) return "??";
    const palabras = nombreCompleto.trim().split(" ");
    if (palabras.length >= 2) {
        // Toma la primera letra del primer nombre y la primera del primer apellido
        return (palabras[0][0] + palabras[1][0]).toUpperCase();
    }
    return palabras[0][0].toUpperCase(); // Si solo tiene un nombre
}

/* ==========================================
   3. FUNCIÓN DE RENDERIZADO (DIBUJAR LISTA)
   ========================================== */
function renderizarClientes(datos) {
    listaContenedor.innerHTML = '';
    contadorTexto.innerText = `${datos.length} clientes`;

    datos.forEach(cliente => {  
        const estadoLimpio = (cliente.estado || 'sin prestamo').toLowerCase().replace(/\s+/g, '-');
        
        // --- LLAMADA A LA FUNCIÓN DE INICIALES ---
        const iniciales = obtenerIniciales(cliente.nombre);
        
        const card = document.createElement('div');
        card.className = `cliente-card status-${estadoLimpio}`;
        
        const esNuevo = cliente.estado === 'sin prestamo';

        card.innerHTML = `
            <div class="cliente-header">
                <!-- Quitamos el style de background para que lo maneje el CSS -->
                <div class="cliente-avatar">
                    ${iniciales}
                </div>
                <div class="cliente-info">
                    <h3>${cliente.nombre}</h3>
                    <p>Adeuda: <span class="monto-adeuda">$ ${(cliente.monto || 0).toLocaleString()}</span></p>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="badge-estado badge-${estadoLimpio}">
                        ${cliente.estado.toUpperCase()}
                    </div>
                    <div class="chevron-detalle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>
            </div>

            <div class="cliente-detalles">
                <div class="info-grid">
                    <div class="info-item"><strong>🆔 DNI:</strong> ${cliente.dni || '-'}</div>
                    <div class="info-item"><strong>📞 Tel:</strong> ${cliente.tel || '-'}</div>
                    <div class="info-item"><strong>📍 Loc:</strong> ${cliente.direccion || '-'}</div>
                    <div class="info-item"><strong>💼 Job:</strong> ${cliente.ocupacion || '-'}</div>
                </div>
                
                ${!esNuevo ? `
                    <div class="cuotas-progreso">
                        <div class="progreso-header">
                            <span>💳 $ ${cliente.monto.toLocaleString()} • ${cliente.cuotas} cuotas</span>
                        </div>
                        <div class="barra-fondo">
                            <div class="barra-completada" style="width: 30%"></div>
                        </div>
                    </div>
                ` : ''}

                <div class="acciones-card">
                    <button class="btn-secundario-v2 btn-ver-detalles">Ver detalles</button>
                    ${esNuevo ? 
                        `<button class="btn-principal-v2 btn-otorgar" style="background-color: var(--color-primario);">➕ Otorgar préstamo</button>` :
                        `<button class="btn-principal-v2 btn-cobrar">＄ Cobrar cuota</button>`
                    }
                </div>
            </div>
        `;

        // Eventos
        card.onclick = (e) => { if(!e.target.closest('button')) card.classList.toggle('expanded'); };
        card.querySelector('.btn-ver-detalles').onclick = (e) => { e.stopPropagation(); abrirModalDetalles(cliente); };
        const btnAccion = card.querySelector('.btn-otorgar') || card.querySelector('.btn-cobrar');
        btnAccion.onclick = (e) => { e.stopPropagation(); esNuevo ? prepararOtorgar(cliente) : abrirModalCobro(cliente); };

        listaContenedor.appendChild(card);
    });
}

// Helpers
function getIconoEstado(est) { return est === 'atrasado' ? '⚠️' : '✅'; }
function getLabelEstado(est) { return est === 'atrasado' ? 'Atrasado' : 'Al día'; }

/* ==========================================
   4. LÓGICA MODAL NUEVO CLIENTE (GUARDAR)
   ========================================== */
btnAbrirNuevo.onclick = () => modalNuevo.classList.add('active');

const cerrarModalNuevo = () => {
    modalNuevo.classList.remove('active');
    // Limpiar campos
    document.querySelectorAll('.modal-body input').forEach(i => i.value = '');
};

btnCerrarNuevoX.onclick = cerrarModalNuevo;
btnCancelarNuevo.onclick = cerrarModalNuevo;

// FUNCIÓN GUARDAR REAL
btnGuardarCliente.onclick = () => {
    const nombre = document.getElementById('cl-nombre').value;
    const apellido = document.getElementById('cl-apellido').value;
    const dni = document.getElementById('cl-dni').value;
    const tel = document.getElementById('cl-tel').value;

    if(!nombre || !apellido) return alert("Nombre y Apellido son necesarios");

    const nuevoCliente = {
        id: Date.now(),
        nombre: `${nombre} ${apellido}`,
        monto: 0,
        estado: "al_dia",
        iniciales: (nombre[0] + apellido[0]).toUpperCase(),
        color: "var(--avatar-celeste)",
        dni: dni || "N/A",
        tel: tel || "Sin tel",
        direccion: "Pendiente",
        ocupacion: "N/A",
        cuotas: "0/0"
    };

    clientes.unshift(nuevoCliente);
    renderizarClientes(clientes);
    cerrarModalNuevo();
};

/* ==========================================
   5. LÓGICA MODAL COBRO ( CALCULADORA )
   ========================================== */
function abrirModalCobro(cliente) {
    document.getElementById('cobroNombreCliente').innerText = cliente.nombre;
    cuotasSeleccionadas = 1;
    actualizarMontoCobro();
    modalCobro.classList.add('active');
}

btnMas.onclick = () => { if(cuotasSeleccionadas < 12) { cuotasSeleccionadas++; actualizarMontoCobro(); }};
btnMenos.onclick = () => { if(cuotasSeleccionadas > 1) { cuotasSeleccionadas--; actualizarMontoCobro(); }};

function actualizarMontoCobro() {
    displayCant.innerText = cuotasSeleccionadas;
    const total = cuotasSeleccionadas * VALOR_CUOTA_BASE;
    displayMontoFinal.innerText = `$ ${total.toLocaleString()}`;
}

btnCerrarCobroX.onclick = () => modalCobro.classList.remove('active');


/* ==========================================
   FUNCIÓN: ABRIR MODAL Y CARGAR DATOS
   ========================================== */
function abrirModalCobro(cliente) {
    clienteSeleccionado = cliente; // Guardamos los datos del cliente
    cuotasAPagar = 1; // Reseteamos el contador

    // 1. Llenar encabezado y resumen
    document.getElementById('cobroNombreCliente').innerText = cliente.nombre;
    document.getElementById('cobroMonto').innerText = `$ ${cliente.monto.toLocaleString()}`;
    document.getElementById('cobroTotal').innerText = `$ ${(cliente.monto * 1.2).toLocaleString()}`; // Ejemplo: deuda + interés
    document.getElementById('cobroCuota').innerText = `$ ${VALOR_CUOTA_ESTANDAR.toLocaleString()}`;
    document.getElementById('cobroProgreso').innerText = cliente.cuotas;

    // 2. Calcular cuotas restantes para el botón "Pagar Todo"
    // Asumiendo que cliente.cuotas es "1/6", sacamos el 1 y el 6
    const partes = cliente.cuotas.split('/');
    const pagadas = parseInt(partes[0]);
    const totales = parseInt(partes[1]);
    const restantes = totales - pagadas;

    const btnPagarTodo = document.getElementById('btnPagarTodo');
    if (restantes > 0) {
        btnPagarTodo.innerText = `Pagar todo (${restantes} cuotas — $ ${(restantes * VALOR_CUOTA_ESTANDAR).toLocaleString()})`;
        btnPagarTodo.style.display = "block";
    } else {
        btnPagarTodo.style.display = "none";
    }

    // 3. Actualizar la visualización del cálculo
    actualizarCalculoCobro();

    // 4. Mostrar el modal
    document.getElementById('modalCobrarCuota').classList.add('active');
}

/* ==========================================
   LÓGICA DE LA CALCULADORA DE CUOTAS
   ========================================== */


function actualizarCalculoCobro() {
    displayCant.innerText = cuotasAPagar;
    const total = cuotasAPagar * VALOR_CUOTA_ESTANDAR;
    displayMontoFinal.innerText = `$ ${total.toLocaleString()}`;
}

// Botón +
document.getElementById('btnMas').onclick = () => {
    if (cuotasAPagar < 12) { // Límite máximo
        cuotasAPagar++;
        actualizarCalculoCobro();
    }
};

// Botón -
document.getElementById('btnMenos').onclick = () => {
    if (cuotasAPagar > 1) { // Límite mínimo
        cuotasAPagar--;
        actualizarCalculoCobro();
    }
};

// Botón Confirmar Pago (Para cerrar y guardar)
document.querySelector('.btn-confirmar-final').onclick = () => {
    alert(`Pago confirmado para ${clienteSeleccionado.nombre} por $ ${cuotasAPagar * VALOR_CUOTA_ESTANDAR}`);
    document.getElementById('modalCobrarCuota').classList.remove('active');
    // Aquí podrías restar el monto al cliente real
};

// Botón Cerrar
document.getElementById('btnCerrarCobro').onclick = () => {
    document.getElementById('modalCobrarCuota').classList.remove('active');
};




/* ==========================================
   LÓGICA MODAL DETALLES
   ========================================== */
function abrirModalDetalles(cliente) {
    // 1. ¡ESTO FALTABA! Guardamos al cliente para que el botón de editar sepa a quién usar
    clienteSeleccionado = cliente; 

    // 1. Llenar textos básicos
    document.getElementById('det-cliente-nombre').innerText = cliente.nombre;
    document.getElementById('det-dni').innerText = cliente.dni || "N/A";
    document.getElementById('det-tel').innerText = cliente.tel || "N/A";
    document.getElementById('det-ciudad').innerText = cliente.direccion.split(',')[0] || "-";
    document.getElementById('det-ocupacion').innerText = cliente.ocupacion || "-";
    document.getElementById('det-prestado').innerText = `$ ${cliente.monto.toLocaleString()}`;
    document.getElementById('det-cuotas-resumen').innerText = cliente.cuotas;

    // 2. Lógica de la barra de progreso
    const [pagadas, totales] = cliente.cuotas.split('/').map(Number);
    const porcentaje = totales > 0 ? (pagadas / totales) * 100 : 0;
    document.getElementById('det-progreso-barra').style.width = `${porcentaje}%`;
    document.getElementById('det-progreso-texto').innerText = `${pagadas} DE ${totales} CUOTAS PAGADAS`;

    // 3. Generar historial de cuotas (Falso ejemplo según cuotas del cliente)
    const historialBody = document.getElementById('historialCuotas');
    historialBody.innerHTML = ''; // Limpiar

    for (let i = 1; i <= totales; i++) {
        const estado = i <= pagadas ? 'PAGADA' : 'PENDIENTE';
        const item = document.createElement('div');
        item.className = `cuota-item ${estado === 'PAGADA' ? 'pagada' : ''}`;
        item.innerHTML = `
            <div>
                <p style="font-weight: 600; font-size: 0.9rem;">Cuota ${i}</p>
                <p style="font-size: 0.75rem; color: #777;">10/${i+1}/2026</p>
            </div>
            <div style="text-align: right;">
                <p style="font-weight: 700; font-size: 0.9rem;">$ 13.000</p>
                <span class="badge-cuota ${estado.toLowerCase()}">${estado}</span>
            </div>
        `;
        historialBody.appendChild(item);
    }

    document.getElementById('modalDetalles').classList.add('active');
}

// Botón para cerrar
document.getElementById('btnCerrarDetalles').onclick = () => {
    document.getElementById('modalDetalles').classList.remove('active');
};




/*---------------- LÓGICA EDITAR CLIENTE ------------- */

// 1. Función para abrir el modal y cargar los datos

function abrirModalEditar(cliente) {
    if (!cliente) return;

    // 1. Nombre y Apellido
    const partesNombre = cliente.nombre.split(' ');
    document.getElementById('edit-nombre').value = partesNombre[0] || "";
    document.getElementById('edit-apellido').value = partesNombre.slice(1).join(' ') || "";

    // 2. Datos básicos
    document.getElementById('edit-dni').value = cliente.dni || "";
    document.getElementById('edit-tel').value = cliente.tel || "";
    document.getElementById('edit-ocupacion').value = cliente.ocupacion || "";

    // 3. LÓGICA PARA LA DIRECCIÓN (Desarmar el texto largo)
    // Si los campos individuales no existen, intentamos sacarlos de cliente.direccion
    if (cliente.direccion && cliente.direccion.includes(',')) {
        const partesDir = cliente.direccion.split(','); // Divide por las comas
        
        // Ciudad: lo que está al final
        document.getElementById('edit-ciudad').value = partesDir[2] ? partesDir[2].trim() : (cliente.ciudad || "");
        
        // Barrio: lo que está en el medio
        document.getElementById('edit-barrio').value = partesDir[1] ? partesDir[1].trim() : (cliente.barrio || "");
        
        // Calle y Nro: lo que está al principio (ej: "Belgrano 654")
        const calleNro = partesDir[0] ? partesDir[0].trim().split(' ') : [];
        if (calleNro.length > 0) {
            document.getElementById('edit-nro').value = calleNro.pop(); // Saca el último elemento (nro)
            document.getElementById('edit-calle').value = calleNro.join(' '); // El resto es la calle
        }
    } else {
        // Si no hay comas, cargamos lo que haya por las dudas
        document.getElementById('edit-ciudad').value = cliente.ciudad || "";
        document.getElementById('edit-barrio').value = cliente.barrio || "";
        document.getElementById('edit-calle').value = cliente.calle || "";
        document.getElementById('edit-nro').value = cliente.nro || "";
    }

    document.getElementById('modalEditarCliente').classList.add('active');
}

// 2. Evento del botón "Editar cliente" que ya tenías en el Modal Detalle
document.querySelector('.btn-editar-cliente').onclick = () => {
    // Cerramos el modal de detalles y abrimos el de edición
    document.getElementById('modalDetalles').classList.remove('active');
    abrirModalEditar(clienteSeleccionado); // 'clienteSeleccionado' es el que cargaste en el modal de detalles
};

// 3. Botón Guardar Cambios
document.getElementById('btnGuardarEdicion').onclick = () => {
    if (!clienteSeleccionado) return;

    // Capturamos los valores de los inputs
    const nombre = document.getElementById('edit-nombre').value;
    const apellido = document.getElementById('edit-apellido').value;

    // Actualizamos el objeto clienteSeleccionado
    clienteSeleccionado.nombre = `${nombre} ${apellido}`;
    clienteSeleccionado.dni = document.getElementById('edit-dni').value;
    clienteSeleccionado.tel = document.getElementById('edit-tel').value;
    clienteSeleccionado.ocupacion = document.getElementById('edit-ocupacion').value;
    
    // Guardamos los campos de dirección
    clienteSeleccionado.ciudad = document.getElementById('edit-ciudad').value;
    clienteSeleccionado.barrio = document.getElementById('edit-barrio').value;
    clienteSeleccionado.calle = document.getElementById('edit-calle').value;
    clienteSeleccionado.nro = document.getElementById('edit-nro').value;

    // Actualizamos la dirección combinada (por si la usas en otros lados)
    clienteSeleccionado.direccion = `${clienteSeleccionado.calle} ${clienteSeleccionado.nro}, ${clienteSeleccionado.barrio}, ${clienteSeleccionado.ciudad}`;

    // Refrescar la lista de la pantalla principal
    renderizarClientes(clientes);

    // Cerrar el modal y avisar
    document.getElementById('modalEditarCliente').classList.remove('active');
    alert("¡Datos actualizados correctamente!");
};

// 4. Botones Cerrar/Cancelar
document.getElementById('btnCerrarEditar').onclick = () => document.getElementById('modalEditarCliente').classList.remove('active');
document.getElementById('btnCancelarEditar').onclick = () => document.getElementById('modalEditarCliente').classList.remove('active');










function prepararOtorgar(cliente) {
    // 1. Guardamos el cliente actual para usarlo luego al guardar
    clienteSeleccionado = cliente; 

    // 2. Cargamos el nombre en el modal
    const inputNombre = document.getElementById('oto-nombre');
    if(inputNombre) inputNombre.value = cliente.nombre;

    // 3. Ponemos la fecha de hoy por defecto
    const inputFecha = document.getElementById('oto-fecha-inicio');
    if(inputFecha) inputFecha.valueAsDate = new Date();

    // 4. Mostramos el modal (Asegúrate de que el ID sea modalOtorgar)
    const modal = document.getElementById('modalOtorgar');
    if(modal) {
        modal.classList.add('active');
        calcularPrestamo(); // Ejecuta los cálculos iniciales
    } else {
        console.error("No se encontró el modal con ID 'modalOtorgar'");
    }
}

// Función para cerrar el modal
function cerrarModalOtorgar() {
    const modal = document.getElementById('modalOtorgar');
    if (modal) modal.classList.remove('active');
}

// Función para los botones + y -
function ajustar(id, cambio) {
    const input = document.getElementById(id);
    if (!input) return;
    let valor = parseInt(input.value) || 0;
    valor += cambio;
    if (valor < 1) valor = 1; // No permite valores menores a 1
    input.value = valor;
    calcularPrestamo(); // Recalcula automáticamente al tocar + o -
}

function calcularPrestamo() {
    // Captura de valores (Asegúrate que los IDs coincidan con tu HTML)
    const monto = parseFloat(document.getElementById('oto-monto').value) || 0;
    const interes = parseFloat(document.getElementById('oto-interes').value) || 0;
    const cuotas = parseInt(document.getElementById('oto-cuotas').value) || 1;
    const cadaX = parseInt(document.getElementById('oto-frec-valor').value) || 1;
    const frecuencia = document.getElementById('oto-frec-tipo').value;
    const fechaInicioStr = document.getElementById('oto-fecha-inicio').value;

    // 1. Cálculos de Dinero
    const totalADevolver = monto + (monto * (interes / 100));
    const valorCuota = totalADevolver / cuotas;

    // 2. Cálculo de Fecha Fin (Lógica de calendario)
    if (fechaInicioStr) {
        let fechaFin = new Date(fechaInicioStr + 'T00:00:00');
        
        // El préstamo termina después de (cuotas - 1) intervalos
        for (let i = 1; i < cuotas; i++) {
            if (frecuencia === "Diario") {
                fechaFin.setDate(fechaFin.getDate() + cadaX);
            } else if (frecuencia === "Semanal") {
                fechaFin.setDate(fechaFin.getDate() + (cadaX * 7));
            } else if (frecuencia === "Mensual") {
                fechaFin.setMonth(fechaFin.getMonth() + cadaX);
            }
        }
        document.getElementById('oto-fecha-fin').value = fechaFin.toLocaleDateString('es-AR');
    }

    // 3. Mostrar resultados en el cuadro lila (Campos calculados)
    document.getElementById('res-total').innerText = `$ ${totalADevolver.toLocaleString('es-AR')}`;
    document.getElementById('res-cuota').innerText = `$ ${valorCuota.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

/* ==========================================
   6. INICIO DE LA APP
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    renderizarClientes(clientes);
});