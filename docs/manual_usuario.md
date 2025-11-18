# Manual de usuario · Control de Activos

## 1. Introducción
Control de Activos es un panel administrativo web que centraliza el inventario institucional, el registro de incidencias técnicas y la emisión de reportes oficiales (diagnósticos y bajas). Todo el flujo opera bajo autenticación, por lo que solo el personal autorizado puede consultar o modificar información.

## 2. Acceso e interfaz general
1. **Inicio de sesión:** Ingresa desde `/login` con tu correo y contraseña asignados. El formulario solicita ambos campos y protege la sesión con tokens CSRF para evitar envíos no autorizados.
2. **Roles disponibles:**
   - **Administrador:** acceso completo, incluida la creación de usuarios nuevos.
   - **Técnico/Tecnico:** gestión de activos e incidencias, incluidos diagnósticos y reportes de baja.
   - **Colaborador:** puede registrar y dar seguimiento a incidencias, pero no ve el módulo de usuarios.
3. **Barra lateral:** tras autenticarte verás accesos directos a *Activos fijos*, *Incidencias*, *Reportes* (buscador de diagnósticos/bajas) y el formulario de cierre de sesión. Si tu cuenta es de **Administrador** se habilita también el acceso **Usuarios** para gestionar cuentas internas.
4. **Barra superior:** muestra el título contextual de la pantalla y tus datos de sesión (nombre completo y rol). Usa el botón *Cerrar sesión* en el menú lateral antes de abandonar el equipo compartido.

## 3. Módulo de activos fijos
### 3.1 Resumen y búsqueda
- El tablero muestra tarjetas de métricas: total de activos, cuántos están operativos, cuántos conservan garantía y cuántas categorías únicas hay cargadas.
- El buscador permite filtrar por categoría, área, marca, número de serie o palabra clave. Cuando un filtro está activo se ofrece un botón *Limpiar* para volver al listado completo.

### 3.2 Registro de activos
1. Pulsa **Registrar activo fijo** para desplegar el formulario (el botón cambia a *Ver listado* para volver al inventario).
2. Completa los campos requeridos: categoría, departamento, área, estado, fechas de compra/garantía, precio, propietario, datos de contacto y número de serie.
3. Envía el formulario para guardar. Si la validación detecta inconsistencias (por ejemplo, campos obligatorios vacíos) se mostrará un bloque con los errores señalados.

### 3.3 Consulta detallada
- Desde la tabla principal, pulsa el enlace del identificador para ver el detalle completo del activo. La vista incluye la información formateada (precios en MXN, fechas legibles) y accesos directos para **Editar** o **Eliminar**.
- Al eliminar, el sistema muestra un cuadro de confirmación antes de ejecutar la acción.

### 3.4 Edición o eliminación masiva
- Para editar, utiliza la opción *✏️ Editar activo* en la vista de detalle; el formulario precarga los valores existentes para que solo modifiques lo necesario.
- Para eliminar, usa el botón *🗑️ Eliminar activo*. Debes confirmar en el diálogo del navegador; de lo contrario la operación se cancela.

## 4. Módulo de incidencias
### 4.1 Listado y filtros
- La pantalla principal presenta tarjetas por incidencia con datos clave (prioridad, tipo, origen, serie, placa y descripción). También muestra al responsable que reportó y la fecha del último diagnóstico.
- En la parte superior tienes filtros por estado (todas, abiertas, en proceso o cerradas), un buscador por texto y la casilla *Solo incidencias de hoy*. Los filtros se envían vía GET y se pueden limpiar con el enlace *Limpiar*.
- Cada tarjeta incluye un control contextual para cambiar el estado sin salir de la vista: presiona la etiqueta de estado y selecciona el nuevo valor. El sistema confirma cuando la actualización se guarda correctamente.

### 4.2 Registrar incidencia
1. Pulsa **➕ Registrar incidencia**.
2. Selecciona el activo afectado y la persona que reporta. Si no está dada de alta, usa el botón *Usar contacto externo* para capturar nombre, tipo y datos de contacto manualmente.
3. Define tipo, origen, prioridad y estado inicial de la incidencia.
4. Describe el problema (mínimo 10 caracteres) y, si ya se cerró, registra la fecha/hora en *Fecha y hora de cierre*.
5. Envía el formulario para generar el folio. El sistema confirmará con un mensaje en verde cuando el registro sea exitoso.

### 4.3 Editar incidencia
- Desde el listado, pulsa *Editar datos* para modificar los campos originales (activo, persona, descripción, prioridad, etc.).
- Se conservan los mismos validadores que en el alta y puedes volver a alternar entre usuario registrado o contacto externo.

### 4.4 Diagnóstico técnico
1. En la tarjeta de la incidencia selecciona **Registrar diagnóstico**.
2. La pantalla muestra el resumen del reporte, el estado actual (con formulario para actualizarlo) y el formulario de diagnóstico.
3. Completa los datos: fecha del diagnóstico, trabajo realizado, tiempo de uso (puedes indicar motivo/observaciones en formato “Motivo: …”), especificaciones técnicas (procesador, RAM, almacenamiento), diagnóstico y firma del técnico.
4. Adjunta evidencia opcional:
   - URL (por ejemplo, un enlace a un repositorio de fotos).
   - Imágenes: el formulario admite varias, con límite configurable; las imágenes se codifican para incrustarse en el PDF.
5. Marca si el activo requiere baja. Si eliges **Sí**, se desplegarán los campos *Fecha de baja* y *Fecha de reimpresión* (opcional). La fecha de baja se rellena automáticamente con la fecha de diagnóstico cuando queda vacía; en el campo de reimpresión captura el día exacto en el que se volvió a emitir el formato para que quede registrado.
6. Envía el formulario. Se mostrará una alerta de éxito con un enlace para descargar el PDF del diagnóstico. Cuando se generó un reporte de baja, también obtendrás los enlaces para verlo/descargarlo.
7. Al final de la página aparece el historial de reportes de diagnóstico (con enlaces a cada PDF y, si aplica, al reporte de baja asociado).
8. Si la incidencia está cerrada ya no se permite registrar nuevos diagnósticos; la sección aparece bloqueada con un aviso.

## 5. Buscador de reportes
- Accede mediante el enlace **Reportes** de la barra lateral. La vista agrupa diagnósticos y bajas con un formulario de filtros (tipo de reporte, término de búsqueda, periodo *Desde/Hasta* y casilla *Solo reportes recientes*).
- Debajo encontrarás chips rápidos (Hoy, Últimos 7 días, Últimos 30 días y Año en curso) que rellenan automáticamente los filtros de fechas.
- Las métricas superiores muestran conteos totales de diagnósticos, bajas y reportes recientes.
- Cada diagnóstico listado incluye resumen del activo, contacto que reportó, descripción del trabajo, evidencia y accesos a su PDF y al PDF de baja (si existe). Los reportes de baja muestran fechas oficiales, responsable que autoriza, datos completos del activo y vínculos al PDF correspondiente.

## 6. Reportes de baja
- El módulo **Reportes de baja** muestra todas las bajas emitidas ordenadas por fecha. Cada tarjeta resume el folio, fechas clave, datos del activo, incidencia vinculada y el diagnóstico técnico.
- Usa los botones *Ver reporte PDF* o *Descargar PDF* para obtener el documento oficial. Desde la sección de incidencia relacionada puedes volver al detalle del diagnóstico para más contexto.

## 7. Gestión de usuarios (solo Administrador)
1. Desde la barra lateral elige **Usuarios** (solo visible para Administradores) y pulsa **Registrar usuario**; también puedes acceder directo mediante `/usuarios/registro`.
2. Completa nombre, apellido, correo institucional, rol y contraseña (debe coincidir con la confirmación).
3. Al seleccionar el rol puedes elegir **Administrador**, **Técnico** o **Colaborador**. Usa esta opción para dar de alta al personal operativo (técnicos o colaboradores) sin necesidad de que ellos tengan privilegios elevados.
4. El panel de usuarios muestra la lista completa de cuentas con su rol, correo y fecha de alta, además de tarjetas resumen por tipo de rol, para que identifiques rápidamente el equilibrio del equipo.
5. Si el correo ya existe o las contraseñas no coinciden se mostrará un mensaje de error; corrige y vuelve a guardar.
6. Tras un alta exitosa, se te redirige nuevamente al panel de usuarios mostrando el aviso *Usuario creado correctamente*.

## 8. Buenas prácticas y solución de problemas
- **Errores de validación:** cualquier formulario mostrará un panel rojo con la lista de errores detectados. Revisa los campos marcados, corrige y vuelve a enviar.
- **Sesiones caducadas:** si permaneces inactivo por más de dos horas deberás iniciar sesión nuevamente.
- **Descarga de PDF bloqueada:** verifica que el navegador permita ventanas emergentes para el dominio interno; los enlaces de diagnóstico y baja abren el archivo en una pestaña nueva.
- **Cerrar sesión en equipos compartidos:** usa siempre el botón *Cerrar sesión* antes de dejar el dispositivo para evitar accesos no autorizados.
