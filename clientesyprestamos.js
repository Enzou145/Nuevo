// CONFIGURACIÓN DE TU PROYECTO
const SUPABASE_URL = "https://ljsnvsvlnazprcfhoytc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ELqT_WM7MrJonyYE6L6P1Q_kmAPw3bB";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);




// 2. VARIABLES GLOBALES Y ELEMENTOS
const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
if (!usuarioLogueado) window.location.href = "index.html";

let clientes = [];
const listaContenedor = document.getElementById('listaClientes');
const contadorTexto = document.getElementById('contadorClientes');

/* ==========================================
   1. VARIABLES DE ESTADO Y ELEMENTOS DEL DOM
   ========================================== */
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.getElementById('menuToggle');
const overlay = document.getElementById('sidebarOverlay');


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


async function cargarClientesDB() {
    const { data, error } = await supabaseClient
        .from('clientes')
        .select(`
        *,
        prestamos (*)
        `)
        .eq('user_id', usuarioLogueado.auth_user_id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error cargando clientes:", error);
        return;
    }

    clientes = data || [];

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

for (const cliente of clientes) {
    const prestamo = cliente.prestamos?.[0];
    if (!prestamo || cliente.estado === 'finalizado' || cliente.estado === 'sin prestamo') continue;

    const pagadas = prestamo.cuotas_pagadas || 0;
    const totales = prestamo.cuotas_totales || 0;
    if (pagadas >= totales) continue;

    // Calcular fecha de próxima cuota
    let fechaProxima = new Date(prestamo.fecha_inicio + 'T00:00:00');
    const intervalo = prestamo.intervalo_pago || 1;
    const frecuencia = prestamo.frecuencia_pago || 'Mensual';
    const proximaCuota = pagadas + 1;

    if (frecuencia === 'Diario') fechaProxima.setDate(fechaProxima.getDate() + (proximaCuota * intervalo));
    else if (frecuencia === 'Semanal') fechaProxima.setDate(fechaProxima.getDate() + (proximaCuota * intervalo * 7));
    else if (frecuencia === 'Mensual') fechaProxima.setMonth(fechaProxima.getMonth() + (proximaCuota * intervalo));

    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    let nuevoEstado;
    if (fechaProxima < hoy) {
        nuevoEstado = 'atrasado';
    } else if (fechaProxima.toDateString() === mañana.toDateString()) {
        nuevoEstado = 'vence mañana';
    } else {
        nuevoEstado = 'al dia';
    }


    // Solo actualiza si cambió el estado
    if (cliente.estado !== nuevoEstado) {
        await supabaseClient.from('clientes').update({ estado: nuevoEstado }).eq('id', cliente.id);
        cliente.estado = nuevoEstado; // Actualiza local también
    }
}

    renderizarClientes(clientes);
    
    // Actualizar contador
    if (contadorTexto) contadorTexto.textContent = `${clientes.length} clientes`;
}




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
    if (!listaContenedor) return;
    listaContenedor.innerHTML = '';
    
    if (contadorTexto) contadorTexto.innerText = `${datos.length} clientes`;

    datos.forEach(cliente => { 
        const prestamo = cliente.prestamos?.slice(-1)[0];
        const cuotasPagadas = prestamo?.cuotas_pagadas || 0;
        const cuotasTotales = prestamo?.cuotas_totales || 0;

        const porcentaje = (cuotasTotales && cuotasPagadas >= 0)
            ? Math.round((cuotasPagadas / cuotasTotales) * 100)
            : 0;
        
        const nombreCompleto = `${cliente.nombre} ${cliente.apellido || ''}`;
        
        // CORRECCIÓN AQUÍ: Agregamos un valor por defecto para que no explote si el estado es null
        const estadoRaw = cliente.estado || 'sin prestamo';
        const estadoLimpio = estadoRaw.toLowerCase().replace(/\s+/g, '-');
        
        const iniciales = ((cliente.nombre?.charAt(0) || '') + (cliente.apellido?.charAt(0) || '')).toUpperCase();        const direccionCompleta = `${cliente.calle || ''} ${cliente.nro_calle || ''} (${cliente.barrio || ''})`;

        const card = document.createElement('div');
        card.className = `cliente-card status-${estadoLimpio}`;
        
        const esNuevo = estadoRaw === 'sin prestamo';
        const esFinalizado = estadoRaw === 'finalizado';

        const accionesHTML = `
            <div class="acciones-card">
                <button class="btn-secundario-v2 btn-ver-detalles">Ver detalles</button>
                ${esNuevo ? 
                    `<button class="btn-principal-v2 btn-otorgar">Otorgar préstamo</button>` :
                esFinalizado ? 
                    `<button class="btn-principal-v2 btn-eliminar" style="background-color: #ef4444; color: white;">🗑️ Eliminar</button>` :
                    `<button class="btn-principal-v2 btn-cobrar">＄ Cobrar cuota</button>`
                }
            </div>
        `;

        card.innerHTML = `
            <div class="cliente-header">
                <div class="cliente-avatar">${iniciales}</div>
                <div class="cliente-info">
                    <h3>${nombreCompleto}</h3>
                    <p>Adeuda: <span class="monto-adeuda">$ ${(prestamo ? (prestamo.total_devolver - (prestamo.cuotas_pagadas * prestamo.valor_cuota)) : 0).toLocaleString()}</span></p>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="badge-estado badge-${estadoLimpio}">
                        ${estadoRaw.toUpperCase()}
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
                    <div class="info-item"><strong>DNI:</strong> ${cliente.dni || '-'}</div>
                    <div class="info-item"><strong>Tel:</strong> ${cliente.telefono || '-'}</div>
                    <div class="info-item"><strong>Loc:</strong> ${direccionCompleta}</div>
                    <div class="info-item"><strong>Job:</strong> ${cliente.ocupacion || '-'}</div>
                </div>
                
                ${!esNuevo ? `
                    <div class="cuotas-progreso">
                        <div class="progreso-header" style="display:flex; justify-content:space-between; align-items:center;">
                            <span>$ ${(prestamo?.total_devolver || 0).toLocaleString()}</span>
                            <span> ${cuotasPagadas} DE ${cuotasTotales} cuotas    <strong>${porcentaje}%</strong></span>
                        </div>
                        <div class="barra-fondo">
                            <div class="barra-completada" style="width: ${porcentaje}%"></div>
                        </div>
                    </div>
                ` : ''}
                ${accionesHTML} 
            </div>
        `; 

        card.onclick = (e) => { if(!e.target.closest('button')) card.classList.toggle('expanded'); };
        card.querySelector('.btn-ver-detalles').onclick = (e) => { e.stopPropagation(); abrirModalDetalles(cliente); };

        if (esFinalizado) {
            const btnEliminar = card.querySelector('.btn-eliminar');
            if (btnEliminar) btnEliminar.onclick = (e) => { e.stopPropagation(); abrirModalEliminar(cliente); };
        } else {
            const btnAccion = card.querySelector('.btn-otorgar') || card.querySelector('.btn-cobrar');
            if (btnAccion) btnAccion.onclick = (e) => { e.stopPropagation(); esNuevo ? prepararOtorgar(cliente) : abrirModalCobro(cliente); };
        }

        listaContenedor.appendChild(card);
    });
}


let clienteAEliminarId = null;

function abrirModalEliminar(cliente) {
    clienteAEliminarId = cliente.id;
    document.getElementById('nombreClienteEliminar').innerText = cliente.nombre;
    document.getElementById('modalEliminar').classList.add('active');
}

function cerrarModalEliminar() {
    document.getElementById('modalEliminar').classList.remove('active');
    clienteAEliminarId = null;
}

// Lógica del botón "Eliminar ahora" del modal
document.getElementById('confirmarEliminar').onclick = async () => {
    if (!clienteAEliminarId) return;

    // 1. BORRAR EN SUPABASE
    const { error } = await supabaseClient
        .from('clientes')
        .delete()
        .eq('id', clienteAEliminarId);

    if (error) {
        alert("Error al eliminar");
        return;
    }

    // 2. RECARGAR
    await cargarClientesDB();

    cerrarModalEliminar();

    alert("✅ Cliente eliminado correctamente");
};



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
// REEMPLAZA TU FUNCIÓN btnGuardarCliente.onclick POR ESTA:
// Lógica para el botón "Guardar Cliente" (Gris)
btnGuardarCliente.onclick = () => ejecutarGuardado(false);

// Lógica para el botón "Guardar y Crear Préstamo" (Lila)
// Nota: Asegúrate de que el botón lila en tu HTML tenga id="btnGuardarYPrestar"

async function ejecutarGuardado(abrirPrestamo = false) {
    // CAPTURA CON TUS IDS REALES
    const datosCliente = {
        user_id: usuarioLogueado.auth_user_id,
        nombre: document.getElementById('cl-nombre').value.trim(),
        apellido: document.getElementById('cl-apellido').value.trim(),
        dni: document.getElementById('cl-dni').value.trim(),
        telefono: document.getElementById('cl-tel').value.trim(),
        ciudad: document.getElementById('cl-ciudad').value.trim(),
        barrio: document.getElementById('cl-barrio').value.trim(),
        calle: document.getElementById('cl-calle').value.trim(),
        nro_calle: document.getElementById('cl-nro').value.trim(),
        ocupacion: document.getElementById('cl-ocupacion').value.trim(),
        garantia_producto: document.getElementById('cl-sena').value.trim(),
        garantia_valor: parseFloat(document.getElementById('cl-monto').value) || 0,
        estado: 'sin prestamo'
    };

    if (!datosCliente.nombre || !datosCliente.apellido) {
        alert("Nombre y Apellido son obligatorios");
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('clientes')
            .insert([datosCliente])
            .select();

        if (error) throw error;

        alert("✅ Cliente guardado correctamente");
        
        // Limpiar inputs
        const inputs = document.querySelectorAll('#modalNuevoCliente input');
        inputs.forEach(input => input.value = '');

        cerrarModalNuevo(); // Asegúrate que esta función oculte el modal
        await cargarClientesDB();

        if (abrirPrestamo && data) {
            prepararOtorgar(data[0]);
        }
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ASIGNAR EVENTOS A LOS BOTONES
document.getElementById('btnGuardarCliente').onclick = () => ejecutarGuardado(false);

// Para el botón lila (que no tiene ID en tu HTML, lo buscamos por clase)
const btnLila = document.querySelector('.btn-guardar-prestamo');
if (btnLila) btnLila.onclick = () => ejecutarGuardado(true);


/* ==========================================
   5. LÓGICA MODAL COBRO ( CALCULADORA )
   ========================================== */

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


    const prestamo = cliente.prestamos?.[0];
    if (!prestamo) {
        alert("Este cliente no tiene préstamo");
        return;
    }

    const pagadas = prestamo.cuotas_pagadas || 0;
    const totales = prestamo.cuotas_totales || 0;
    const porcentaje = totales > 0 ? (pagadas / totales) * 100 : 0;

    const barra = document.getElementById('barraProgresoCobro');
    if (barra) barra.style.width = `${porcentaje}%`;

    const nombreCliente = document.getElementById('nombreClienteCobro');
    if (nombreCliente) {
        nombreCliente.innerText = `${cliente.nombre} ${cliente.apellido || ''}`;
    }

    clienteSeleccionado = cliente;
    cuotasAPagar = 1;

document.getElementById('cobroMonto').innerText = `$ ${prestamo.monto_prestado.toLocaleString()}`;
document.getElementById('cobroTotal').innerText = `$ ${prestamo.total_devolver.toLocaleString()}`;
document.getElementById('cobroCuota').innerText = `$ ${prestamo.valor_cuota.toLocaleString()}`;
document.getElementById('cobroProgreso').innerText = `${pagadas}/${totales}`;
    const restantes = totales - pagadas;


    actualizarCalculoCobro();
    modalCobro.classList.add('active');

    document.getElementById('textoProgresoCobro').innerText = `${pagadas} DE ${totales} cuotas`;
    document.getElementById('porcentajeCobro').innerText = `${Math.round(porcentaje)}%`;

    const porcentajeEl = document.getElementById('porcentajeCobro');
}

/* ==========================================
   LÓGICA DE LA CALCULADORA DE CUOTAS
   ========================================== */


function actualizarCalculoCobro() {
    if (!clienteSeleccionado) return;

    const prestamo = clienteSeleccionado.prestamos?.[0];
    if (!prestamo) return;

    displayCant.innerText = cuotasAPagar;

    const total = cuotasAPagar * prestamo.valor_cuota;

    displayMontoFinal.innerText = `$ ${total.toLocaleString()}`;
}

// Botón +
document.getElementById('btnMas').onclick = () => {
    const prestamo = clienteSeleccionado.prestamos?.[0];
    const restantes = prestamo.cuotas_totales - prestamo.cuotas_pagadas;

    if (cuotasAPagar < restantes) {
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
document.querySelector('.btn-confirmar-final').onclick = async () => {

    if (!clienteSeleccionado) return;

    const prestamo = clienteSeleccionado.prestamos?.[0];
    if (!prestamo) return;

    const nuevasPagadas = prestamo.cuotas_pagadas + cuotasAPagar;

    // 1. ACTUALIZAR PRESTAMO
    const { error: errorPrestamo } = await supabaseClient
        .from('prestamos')
        .update({
        cuotas_pagadas: nuevasPagadas,
        estado_prestamo: nuevasPagadas >= prestamo.cuotas_totales  ? 'finalizado'  : 'al dia'        })
        .eq('id', prestamo.id);

    if (errorPrestamo) {
        alert("Error actualizando préstamo");
        return;
    }

    // 2. ACTUALIZAR CLIENTE
    const estadoCliente = nuevasPagadas >= prestamo.cuotas_totales ? 'finalizado' : 'al dia';

    const { error: errorCliente } = await supabaseClient
        .from('clientes')
        .update({ estado: estadoCliente })
        .eq('id', clienteSeleccionado.id);

    if (errorCliente) {
        alert("Error actualizando cliente");
        return;
    }

    // 3. GUARDAR PAGO
    await supabaseClient.from('pagos').insert([{
        user_id: usuarioLogueado.auth_user_id,
        prestamo_id: prestamo.id,
        monto_pagado: cuotasAPagar * prestamo.valor_cuota,
        cantidad_cuotas_pagadas: cuotasAPagar
    }]);

    alert("✅ Pago registrado");

    modalCobro.classList.remove('active');

    await cargarClientesDB();
};


// Botón Cerrar
document.getElementById('btnCerrarCobro').onclick = () => {
    document.getElementById('modalCobrarCuota').classList.remove('active');
};


async function eliminarPrestamo(prestamoId, clienteId) {

    // 1. BORRAR PRESTAMO
    await supabaseClient
        .from('prestamos')
        .delete()
        .eq('id', prestamoId);

    // 2. ACTUALIZAR CLIENTE
    await supabaseClient
        .from('clientes')
        .update({ estado: 'sin prestamo' })
        .eq('id', clienteId);

    await cargarClientesDB();
}

/* ==========================================
   LÓGICA MODAL DETALLES (CORREGIDA)
   ========================================== */
function abrirModalDetalles(cliente) {
    if (!cliente) return;
    clienteSeleccionado = cliente; 

    // 1. Textos en etiquetas (<span>, <h2>, etc.) - Usan .innerText
    document.getElementById('det-cliente-nombre-cabecera').innerText = `${cliente.nombre} ${cliente.apellido || ''}`;
    
    const estadoRaw = cliente.estado || 'sin prestamo';
    const badgeEstado = document.getElementById('det-estado-badge');
    badgeEstado.innerText = estadoRaw.toUpperCase();
    badgeEstado.className = `badge-estado badge-${estadoRaw.toLowerCase().replace(/\s+/g, '-')}`;

    // 2. Datos en INPUTS - !IMPORTANTE: Usan .value!
    document.getElementById('det-dni').value = cliente.dni || "";
    document.getElementById('det-tel').value = cliente.telefono || "";
    document.getElementById('det-ciudad').value = cliente.ciudad || "";
    document.getElementById('det-barrio').value = cliente.barrio || "";
    document.getElementById('det-calle').value = cliente.calle || "";
    document.getElementById('det-nro').value = cliente.nro_calle || "";
    document.getElementById('det-ocupacion').value = cliente.ocupacion || "";
    
    // Campos de garantía (Seña / Producto)
    document.getElementById('det-sena').value = cliente.garantia_producto || "-";
    document.getElementById('det-monto').value = cliente.garantia_valor ? `$ ${cliente.garantia_valor.toLocaleString()}` : "-";
    
    // 3. Datos del préstamo
    const prestamo = cliente.prestamos?.slice(-1)[0];
    const montoPrestado = prestamo?.monto_prestado || 0;
    const montoTotal = prestamo?.total_devolver || 0;
    const cuotasPagas = prestamo?.cuotas_pagadas || 0;
    const cuotasTotales = prestamo?.cuotas_totales || 0;
    const valorCuota = prestamo?.valor_cuota || 0;

    document.getElementById('det-prestado').value = `$ ${montoPrestado.toLocaleString()}`;
    document.getElementById('det-adevolver').value = `$ ${montoTotal.toLocaleString()}`;
    document.getElementById('det-cuotas-resumen').value = `${cuotasPagas} / ${cuotasTotales}`;
    document.getElementById('det-valor-cuota').value = `$ ${Math.round(valorCuota).toLocaleString('es-AR')}`;

    // 4. Lógica de la barra de progreso (CON COLORES DINÁMICOS)
    const barra = document.getElementById('det-progreso-barra');
    const porcentaje = cuotasTotales > 0 ? (cuotasPagas / cuotasTotales) * 100 : 0;
    
    barra.style.width = `${porcentaje}%`;

    // Cambiar color según el estado
    const estadoLower = estadoRaw.toLowerCase();
    
    if (estadoLower.includes("al dia")) {
        barra.style.backgroundColor = "#3b82f6"; // Azul
    } else if (estadoLower.includes("finalizado")) {
        barra.style.backgroundColor = "#22c55e"; // Verde
    } else if (estadoLower.includes("atrasado")) {
        barra.style.backgroundColor = "#ef4444"; // Rojo
    }  else if (estadoLower.includes("vence")) {
    barra.style.backgroundColor = "#f59e0b"; // Naranja
}
    else {
        barra.style.backgroundColor = "#94a3b8"; // Gris por defecto (si no tiene préstamo)
    }
    

    document.getElementById('det-progreso-texto').innerText = `${cuotasPagas} DE ${cuotasTotales} CUOTAS PAGADAS`;
    // 5. Historial Dinámico (MODIFICADO PARA FUNCIONAR COMO LA IMAGEN)
    const historialDiv = document.getElementById('historialCuotas');
    historialDiv.innerHTML = ''; // Limpiar contenido previo

    if (prestamo && cuotasTotales > 0) {
        for (let i = 1; i <= cuotasTotales; i++) {
            // Calcular fecha de cada cuota
            let fechaCuota = new Date(prestamo.fecha_inicio + 'T00:00:00');
            const intervalo = prestamo.intervalo_pago || 1;
            const frecuencia = prestamo.frecuencia_pago || "Mensual";

            if (frecuencia === "Diario") fechaCuota.setDate(fechaCuota.getDate() + (i * intervalo));
            else if (frecuencia === "Semanal") fechaCuota.setDate(fechaCuota.getDate() + (i * intervalo * 7));
            else if (frecuencia === "Mensual") fechaCuota.setMonth(fechaCuota.getMonth() + (i * intervalo));

            const estaPagada = i <= cuotasPagas;

            // Crear el elemento de la cuota con el estilo de la imagen
            const item = document.createElement('div');
            item.className = `cuota-item ${estaPagada ? 'pagada' : ''}`;
            item.innerHTML = `
                <div class="cuota-info">
                    <p class="cuota-numero">Cuota ${i}</p>
                    <p class="cuota-fecha">${fechaCuota.toLocaleDateString('es-AR')}</p>
                </div>
                <div class="cuota-monto-status">
                    <p class="cuota-monto">$ ${valorCuota.toLocaleString('es-AR')}</p>
                    <span class="badge-cuota ${estaPagada ? 'pagada' : 'pendiente'}">${estaPagada ? 'PAGADA' : 'PENDIENTE'}</span>
                </div>
            `;
            historialDiv.appendChild(item);
        }
    } else {
        historialDiv.innerHTML = '<p style="text-align:center; padding:10px; color:gray;">Sin préstamo activo</p>';
    }

    document.getElementById('modalDetalles').classList.add('active');
}


// Función auxiliar para calcular las fechas del historial
function calcularFechaParaCuota(fechaInicio, cuotaIndex, intervalo, frecuencia) {
    let fecha = new Date(fechaInicio + 'T00:00:00');
    if (cuotaIndex === 0) return fecha;

    if (frecuencia === "Diario") {
        fecha.setDate(fecha.getDate() + (cuotaIndex * intervalo));
    } else if (frecuencia === "Semanal") {
        fecha.setDate(fecha.getDate() + (cuotaIndex * intervalo * 7));
    } else if (frecuencia === "Mensual") {
        fecha.setMonth(fecha.getMonth() + (cuotaIndex * intervalo));
    }
    return fecha;
}


// Botón para cerrar
document.getElementById('btnCerrarDetalles').onclick = () => {
    document.getElementById('modalDetalles').classList.remove('active');
};




/*---------------- LÓGICA EDITAR CLIENTE (CORREGIDA) ------------- */

function abrirModalEditar(cliente) {
    if (!cliente) return;
    clienteSeleccionado = cliente; 

    // Mapeo exacto de los campos que vienen de Supabase a tus IDs de edición
    document.getElementById('edit-nombre').value = cliente.nombre || "";
    document.getElementById('edit-apellido').value = cliente.apellido || "";
    document.getElementById('edit-dni').value = cliente.dni || "";
    document.getElementById('edit-tel').value = cliente.telefono || "";
    document.getElementById('edit-ciudad').value = cliente.ciudad || "";
    document.getElementById('edit-barrio').value = cliente.barrio || "";
    document.getElementById('edit-calle').value = cliente.calle || "";
    document.getElementById('edit-nro').value = cliente.nro_calle || "";
    document.getElementById('edit-ocupacion').value = cliente.ocupacion || "";
    document.getElementById('edit-sena').value = cliente.garantia_producto || "";
    document.getElementById('edit-monto').value = cliente.garantia_valor || "";

    document.getElementById('modalEditar').classList.add('active');
}

// Botón "Editar cliente" dentro del Modal de Detalles
const btnIrAEditar = document.querySelector('.btn-editar-cliente');
if (btnIrAEditar) {
    btnIrAEditar.onclick = () => {
        document.getElementById('modalDetalles').classList.remove('active');
        abrirModalEditar(clienteSeleccionado);
    };
}

// GUARDAR CAMBIOS (Actualización en Supabase)
const formEditar = document.getElementById('formEditarCliente');
if (formEditar) {
    formEditar.onsubmit = async (e) => {
        e.preventDefault();
        if (!clienteSeleccionado) return;

        const nuevosDatos = {
            nombre: document.getElementById('edit-nombre').value.trim(),
            apellido: document.getElementById('edit-apellido').value.trim(),
            dni: document.getElementById('edit-dni').value.trim(),
            telefono: document.getElementById('edit-tel').value.trim(),
            ciudad: document.getElementById('edit-ciudad').value.trim(),
            barrio: document.getElementById('edit-barrio').value.trim(),
            calle: document.getElementById('edit-calle').value.trim(),
            nro_calle: document.getElementById('edit-nro').value.trim(),
            ocupacion: document.getElementById('edit-ocupacion').value.trim(),
            garantia_producto: document.getElementById('edit-sena').value.trim(),
            garantia_valor: parseFloat(document.getElementById('edit-monto').value) || 0
        };

        const { error } = await supabaseClient
            .from('clientes')
            .update(nuevosDatos)
            .eq('id', clienteSeleccionado.id);

        if (error) {
            alert("Error al actualizar: " + error.message);
        } else {
            alert("✅ ¡Datos actualizados correctamente!");
            document.getElementById('modalEditar').classList.remove('active');
            await cargarClientesDB(); // Recarga la lista automáticamente
        }
    };
}


// 4. Botones Cerrar/Cancelar (CORREGIDO)
const modalEdicion = document.getElementById('modalEditar');

document.getElementById('btnCerrarEditar').onclick = () => {
    modalEdicion.classList.remove('active');
};

document.getElementById('btnCancelarEditar').onclick = () => {
    modalEdicion.classList.remove('active');
};









/* ==========================================
   LÓGICA OTORGAR PRÉSTAMO (SUBIR A DB)
   ========================================== */
function prepararOtorgar(cliente) {
    clienteSeleccionado = cliente; 

    // Llenar el nombre en el modal
    const elNombre = document.getElementById('nombreClientePrestamo') || document.getElementById('oto-nombre');
    if(elNombre) {
        if(elNombre.tagName === 'INPUT') elNombre.value = `${cliente.nombre} ${cliente.apellido || ''}`;
        else elNombre.innerText = `${cliente.nombre} ${cliente.apellido || ''}`;
    }

    // Agrega esto dentro de prepararOtorgar(), después de donde ya llenas oto-nombre
    const subNombre = document.getElementById('oto-nombre-sub');
    if (subNombre) subNombre.innerText = `${cliente.nombre} ${cliente.apellido || ''}`;

    // Fecha hoy
    const inputFecha = document.getElementById('oto-fecha-inicio');
    if(inputFecha) inputFecha.valueAsDate = new Date();

    document.getElementById('modalOtorgar').classList.add('active');
    calcularPrestamo();
}


function seleccionarFrecuencia(btn) {
    document.querySelectorAll('#modalOtorgar .oto-frec-btn').forEach(b => b.classList.remove('oto-frec-active'));
    btn.classList.add('oto-frec-active');
    document.getElementById('oto-frec-tipo').value = btn.dataset.value;
    calcularPrestamo();
}

// ESTA FUNCIÓN ES LA QUE SE EJECUTA AL DARLE AL BOTÓN "GUARDAR PRÉSTAMO"
async function confirmarOtorgarPrestamo() {
    if (!clienteSeleccionado) return;

      // CORRECCIÓN: Quitamos los puntos antes de convertir a número
    const montoRaw = document.getElementById('oto-monto').value;
    const montoPrestado = parseFloat(montoRaw.replace(/\./g, '')) || 0; 
    

    const interes = parseFloat(document.getElementById('oto-interes').value) || 0;
    const cuotas = parseInt(document.getElementById('oto-cuotas').value) || 1;
    const cadaX = parseInt(document.getElementById('oto-frec-valor').value) || 1;
    const frecuencia = document.getElementById('oto-frec-tipo').value;
    const fechaInicio = document.getElementById('oto-fecha-inicio').value;
    const fechaFin = document.getElementById('oto-fecha-fin').value;

    if (montoPrestado <= 0) {
        alert("Ingresa un monto válido");
        return;
    }

    const totalADevolver = montoPrestado + (montoPrestado * (interes / 100));
    const valorCuota = totalADevolver / cuotas;

    try {
        // 1️⃣ INSERTAR EN PRESTAMOS
        const { error: errorPrestamo } = await supabaseClient
            .from('prestamos')
            .insert([{
                user_id: usuarioLogueado.auth_user_id,
                cliente_id: clienteSeleccionado.id,
                monto_prestado: montoPrestado,
                interes_porcentaje: interes,
                cuotas_totales: cuotas,
                intervalo_pago: cadaX,
                frecuencia_pago: frecuencia,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                total_devolver: totalADevolver,
                valor_cuota: valorCuota,
                estado_prestamo: 'activo'
            }]);

        if (errorPrestamo) throw errorPrestamo;

        // 2️⃣ ACTUALIZAR CLIENTE
        const { error: errorCliente } = await supabaseClient
            .from('clientes')
            .update({ estado: 'al dia' })
            .eq('id', clienteSeleccionado.id);

        if (errorCliente) throw errorCliente;

        alert("✅ Préstamo otorgado con éxito");

        document.getElementById('modalOtorgar').classList.remove('active');
        await cargarClientesDB();

    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
    }
}


// IMPORTANTE: Vincula el botón del modal con la función
// Ejecuta esto al final de tu archivo o dentro de DOMContentLoaded
const btnFinalGuardarPrestamo = document.querySelector('#modalOtorgar .btn-guardar-prestamo') || document.querySelector('.btn-confirmar-prestamo');
if (btnFinalGuardarPrestamo) {
    btnFinalGuardarPrestamo.onclick = confirmarOtorgarPrestamo;
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




// 1. Función para poner puntos automáticamente
function formatearMiles(input) {
    // Quitamos cualquier caracter que no sea número
    let valor = input.value.replace(/\D/g, "");
    // Agregamos los puntos
    valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    input.value = valor;
    // Llamamos al cálculo
    calcularPrestamo();
}

// 2. Función calcularPrestamo corregida
function calcularPrestamo() {
    const montoInput = document.getElementById('oto-monto');
    // Obtenemos el valor numérico real (quitando los puntos para calcular)
    const monto = parseFloat(montoInput.value.replace(/\./g, '')) || 0;
    
    const interes = parseFloat(document.getElementById('oto-interes').value) || 0;
    const cuotas = parseInt(document.getElementById('oto-cuotas').value) || 1;
    const cadaX = parseInt(document.getElementById('oto-frec-valor').value) || 1;
    const frecuencia = document.getElementById('oto-frec-tipo').value;
    const fechaInicioStr = document.getElementById('oto-fecha-inicio').value;

    const totalADevolver = monto + (monto * (interes / 100));
    const valorCuota = totalADevolver / cuotas;

    if (fechaInicioStr) {
        let fechaFin = new Date(fechaInicioStr + 'T00:00:00');
        
        // CORRECCIÓN DE FECHA: Ahora calculamos el fin sumando todos los intervalos
        // Si hay 1 cuota diaria, se suma 1 día.
        if (frecuencia === "Diario") {
            fechaFin.setDate(fechaFin.getDate() + (cuotas * cadaX));
        } else if (frecuencia === "Semanal") {
            fechaFin.setDate(fechaFin.getDate() + (cuotas * cadaX * 7));
        } else if (frecuencia === "Mensual") {
            fechaFin.setMonth(fechaFin.getMonth() + (cuotas * cadaX));
        }
        
        document.getElementById('oto-fecha-fin').value = fechaFin.toISOString().split('T')[0];
    }

    document.getElementById('res-total').innerText = `$ ${totalADevolver.toLocaleString('es-AR')}`;
    document.getElementById('res-cuota').innerText = `$ ${Math.round(valorCuota).toLocaleString('es-AR')}`;
}









/* ==========================================
   FILTRO DROPDOWN
   ========================================== */
let filtroEstadoActivo = 'todos';

const filtroBtn = document.getElementById('filtroBtn');
const filtroMenu = document.getElementById('filtroMenu');
const filtroLabel = document.getElementById('filtroLabel');

filtroBtn.onclick = (e) => {
    e.stopPropagation();
    filtroMenu.classList.toggle('open');
};

document.addEventListener('click', () => filtroMenu.classList.remove('open'));

document.querySelectorAll('.filtro-opcion').forEach(opcion => {
    opcion.onclick = (e) => {
        e.stopPropagation();
        filtroEstadoActivo = opcion.dataset.estado;
        filtroLabel.textContent = opcion.textContent.trim();

        document.querySelectorAll('.filtro-opcion').forEach(o => o.classList.remove('active'));
        opcion.classList.add('active');

        filtroMenu.classList.remove('open');
        aplicarFiltros();
    };
});

// Modifica tu buscador también para usar esta función
document.getElementById('buscadorClientes').addEventListener('input', aplicarFiltros);

function aplicarFiltros() {
    const texto = document.getElementById('buscadorClientes').value.toLowerCase();
    const filtrados = clientes.filter(c => {
        const nombre = `${c.nombre} ${c.apellido || ''}`.toLowerCase();
        const coincideTexto = nombre.includes(texto) || (c.dni || '').includes(texto);
        const estado = (c.estado || 'sin prestamo').toLowerCase();
        const coincideEstado = filtroEstadoActivo === 'todos' || estado === filtroEstadoActivo;
        return coincideTexto && coincideEstado;
    });
    renderizarClientes(filtrados);
}


/* ==========================================
   6. INICIO DE LA APP
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    cargarClientesDB();
});
