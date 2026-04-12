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
    
    // Contador
    if (contadorTexto) contadorTexto.innerText = `${datos.length} clientes`;

    datos.forEach(cliente => { 
        
        const prestamo = cliente.prestamos?.slice(-1)[0];
        const cuotasPagadas = prestamo?.cuotas_pagadas || 0;
        const cuotasTotales = prestamo?.cuotas_totales || 0;

        const porcentaje = (cuotasTotales && cuotasPagadas >= 0)
            ? Math.round((cuotasPagadas / cuotasTotales) * 100)
            : 0;
        
        const nombreCompleto = `${cliente.nombre} ${cliente.apellido || ''}`;
        const estadoLimpio = (cliente.estado || 'sin prestamo').toLowerCase().replace(/\s+/g, '-');
        
        const iniciales = (cliente.nombre.charAt(0) + (cliente.apellido ? cliente.apellido.charAt(0) : '')).toUpperCase();
        
        const direccionCompleta = `${cliente.calle || ''} ${cliente.nro_calle || ''} (${cliente.barrio || ''})`;

        const card = document.createElement('div');
        card.className = `cliente-card status-${estadoLimpio}`;
        
        const esNuevo = cliente.estado === 'sin prestamo';
        const esFinalizado = cliente.estado === 'finalizado';

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
                    <p>Adeuda: <span class="monto-adeuda">$ ${(cliente.monto_total || 0).toLocaleString()}</span></p>
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
                    <div class="info-item"><strong><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/><line x1="14" y1="15" x2="17" y2="15"/></svg> DNI:</strong> ${cliente.dni || '-'}</div>
                    <div class="info-item"><strong><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.97-1.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Tel:</strong> ${cliente.telefono || '-'}</div>
                    <div class="info-item"><strong><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Loc:</strong> ${direccionCompleta}</div>
                    <div class="info-item"><strong><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/><path d="M2 12h20"/></svg> Job:</strong> ${cliente.ocupacion || '-'}</div>
                </div>
                
                ${!esNuevo ? `
                    <div class="cuotas-progreso">
<div class="progreso-header" style="display:flex; justify-content:space-between; align-items:center;">
    <span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:4px"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      $ ${(prestamo?.total_devolver || 0).toLocaleString()}
    </span>
    <span>${cuotasPagadas}/${cuotasTotales} cuotas <strong>${porcentaje}%</strong></span>
</div>
                        <div class="barra-fondo">
                            <div class="barra-completada" style="width: ${porcentaje}%"></div>
                        </div>
                    </div>
                ` : ''}

                ${accionesHTML} 
            </div>
        `; 

        // EVENTOS

        card.onclick = (e) => { 
            if(!e.target.closest('button')) card.classList.toggle('expanded'); 
        };

        card.querySelector('.btn-ver-detalles').onclick = (e) => { 
            e.stopPropagation(); 
            abrirModalDetalles(cliente); 
        };

        if (esFinalizado) {
            const btnEliminar = card.querySelector('.btn-eliminar');
            if (btnEliminar) {
                btnEliminar.onclick = (e) => {
                    e.stopPropagation();
                    abrirModalEliminar(cliente);
                };
            }
        } else {
            const btnAccion = card.querySelector('.btn-otorgar') || card.querySelector('.btn-cobrar');
            if (btnAccion) {
                btnAccion.onclick = (e) => {
                    e.stopPropagation();
                    esNuevo ? prepararOtorgar(cliente) : abrirModalCobro(cliente);
                };
            }
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
document.getElementById('cobroProgreso').innerText = `${pagadas}/${totales} cuotas`;
    const restantes = totales - pagadas;

    const btnPagarTodo = document.getElementById('btnPagarTodo');
    if (restantes > 0) {
        btnPagarTodo.innerText = `Pagar todo (${restantes} cuotas — $ ${(restantes * prestamo.valor_cuota).toLocaleString()})`;
        btnPagarTodo.style.display = "block";
    } else {
        btnPagarTodo.style.display = "none";
    }

    actualizarCalculoCobro();
    modalCobro.classList.add('active');

    document.getElementById('textoProgresoCobro').innerText = `${pagadas}/${totales} cuotas`;
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


document.getElementById('btnPagarTodo').onclick = () => {
    const prestamo = clienteSeleccionado.prestamos?.[0];
    if (!prestamo) return;

    const restantes = prestamo.cuotas_totales - prestamo.cuotas_pagadas;

    cuotasAPagar = restantes;

    actualizarCalculoCobro();
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
   LÓGICA MODAL DETALLES
   ========================================== */
function abrirModalDetalles(cliente) {
    clienteSeleccionado = cliente; 

    // 1. Llenar textos básicos (Usando nombres de Supabase)
    document.getElementById('det-cliente-nombre').innerText = `${cliente.nombre} ${cliente.apellido || ''}`;
    document.getElementById('det-dni').innerText = cliente.dni || "N/A";
    document.getElementById('det-tel').innerText = cliente.telefono || "N/A";
    document.getElementById('det-ciudad').innerText = cliente.ciudad || "-";
    document.getElementById('det-barrio').innerText = cliente.barrio || "-";
    document.getElementById('det-calle').innerText = cliente.calle || "-";
    document.getElementById('det-nro').innerText = cliente.nro_calle || "-";
    document.getElementById('det-ocupacion').innerText = cliente.ocupacion || "-";
    
    // 2. Datos del préstamo
    const prestamo = cliente.prestamos?.slice(-1)[0];
    const montoPrestado = prestamo?.monto_prestado || 0;
    const montoTotal = prestamo?.total_devolver || 0;
    const cuotasPagas = prestamo?.cuotas_pagadas || 0;
    const cuotasTotales = prestamo?.cuotas_totales || 0;

    document.getElementById('det-prestado').innerText = `$ ${montoPrestado.toLocaleString()}`;
    document.getElementById('det-adevolver').innerText = `$ ${montoTotal.toLocaleString()}`;
    document.getElementById('det-cuotas-resumen').innerText = `${cuotasPagas}/${cuotasTotales}`;

    // 3. Lógica de la barra de progreso
    const porcentaje = cuotasTotales > 0 ? (cuotasPagas / cuotasTotales) * 100 : 0;
    document.getElementById('det-progreso-barra').style.width = `${porcentaje}%`;
    document.getElementById('det-progreso-texto').innerText = `${cuotasPagas} DE ${cuotasTotales} CUOTAS PAGADAS`;

    // 4. Limpiar historial (Para simplificar por ahora)
    document.getElementById('historialCuotas').innerHTML = '<p style="text-align:center; padding:10px; color:gray;">Cargando historial...</p>';

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

    // Fecha hoy
    const inputFecha = document.getElementById('oto-fecha-inicio');
    if(inputFecha) inputFecha.valueAsDate = new Date();

    document.getElementById('modalOtorgar').classList.add('active');
    calcularPrestamo();
}

// ESTA FUNCIÓN ES LA QUE SE EJECUTA AL DARLE AL BOTÓN "GUARDAR PRÉSTAMO"
async function confirmarOtorgarPrestamo() {
    if (!clienteSeleccionado) return;

    const montoPrestado = parseFloat(document.getElementById('oto-monto').value) || 0;
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
        document.getElementById('oto-fecha-fin').value = fechaFin.toISOString().split('T')[0];    }

    // 3. Mostrar resultados en el cuadro lila (Campos calculados)
    document.getElementById('res-total').innerText = `$ ${totalADevolver.toLocaleString('es-AR')}`;
    document.getElementById('res-cuota').innerText = `$ ${valorCuota.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

/* ==========================================
   6. INICIO DE LA APP
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    cargarClientesDB();
});