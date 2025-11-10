-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 10-11-2025 a las 17:17:14
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `controlactivos`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `activos_fijos`
--

CREATE TABLE `activos_fijos` (
  `id_activo` int(11) NOT NULL,
  `marca` varchar(100) NOT NULL,
  `modelo` varchar(120) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_area` int(11) NOT NULL,
  `id_categoria_activos` int(11) NOT NULL,
  `estado` enum('ALMACEN','ASIGNADO','EN_REPARACION','PRESTAMO','BAJA') NOT NULL DEFAULT 'ALMACEN',
  `precio_lista` decimal(12,2) DEFAULT NULL,
  `fecha_compra` date DEFAULT NULL,
  `numero_serie` text DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `placa_activo` text NOT NULL,
  `propietario_nombre_completo` text NOT NULL,
  `propietario_contacto` text NOT NULL,
  `fecha_garantia` datetime NOT NULL DEFAULT current_timestamp(),
  `procesador` text NOT NULL,
  `memoria_ram` text NOT NULL,
  `almacenamiento` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `activos_fijos`
--

INSERT INTO `activos_fijos` (`id_activo`, `marca`, `modelo`, `id_usuario`, `id_area`, `id_categoria_activos`, `estado`, `precio_lista`, `fecha_compra`, `numero_serie`, `creado_en`, `actualizado_en`, `placa_activo`, `propietario_nombre_completo`, `propietario_contacto`, `fecha_garantia`, `procesador`, `memoria_ram`, `almacenamiento`) VALUES
(2, 'Lenovo', '34234', NULL, 2, 1, '', 2131231.44, '2025-10-05', '342', '2025-11-01 04:27:40', NULL, '0', '0', '', '2025-11-01 22:36:06', '', '', ''),
(3, 'Lenovo', 'WWWF221', NULL, 1, 3, '', 3445.00, '2025-11-05', '4534', '2025-11-05 17:00:25', '2025-11-05 17:01:01', '0', '0', 'Teams', '2025-11-05 11:00:25', '', '', '');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `areas`
--

CREATE TABLE `areas` (
  `id_area` int(11) NOT NULL,
  `nombre_area` varchar(120) NOT NULL,
  `ubicacion` varchar(200) DEFAULT NULL,
  `id_departamento` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `areas`
--

INSERT INTO `areas` (`id_area`, `nombre_area`, `ubicacion`, `id_departamento`) VALUES
(1, 'Recepción Grupos', 'Módulo 5', 2),
(2, 'Sistemas', 'Módulo 6', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias_activos`
--

CREATE TABLE `categorias_activos` (
  `id_categoria_activos` int(11) NOT NULL,
  `nombre` varchar(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias_activos`
--

INSERT INTO `categorias_activos` (`id_categoria_activos`, `nombre`) VALUES
(1, 'CPU'),
(2, 'Apple TV'),
(3, 'Monitor'),
(4, 'Laptop'),
(5, 'Escanner');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `departamentos`
--

CREATE TABLE `departamentos` (
  `id_departamento` int(11) NOT NULL,
  `nombre_departamento` varchar(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `departamentos`
--

INSERT INTO `departamentos` (`id_departamento`, `nombre_departamento`) VALUES
(1, 'Tecnologia'),
(2, 'Recepcion'),
(3, 'Seguridad'),
(4, 'Mantenimiento');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial`
--

CREATE TABLE `historial` (
  `id_historial` int(11) NOT NULL,
  `id_activo` int(11) NOT NULL,
  `id_incidencia` int(11) DEFAULT NULL,
  `id_usuario_tecnico` int(11) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `diagnostico` text DEFAULT NULL,
  `fecha_diagnostico` date DEFAULT NULL,
  `fecha_ingreso` date NOT NULL DEFAULT curdate(),
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `historial`
--

INSERT INTO `historial` (`id_historial`, `id_activo`, `id_incidencia`, `id_usuario_tecnico`, `descripcion`, `diagnostico`, `fecha_diagnostico`, `fecha_ingreso`, `creado_en`) VALUES
(1, 2, 1, 2, 'gferferrewrew', 'erewrewerewrewrew', '2025-11-19', '2025-11-04', '2025-11-04 18:34:08'),
(5, 3, 2, 2, 'sdfsdfsdfsfds', 'fdfgfdgfdfddsfsd', '2025-11-06', '2025-11-05', '2025-11-06 05:03:21'),
(6, 3, 2, 2, 'rgfgdfgdfgdfg', 'fsdfdsfdsfdsfs', '2025-11-06', '2025-11-05', '2025-11-06 05:03:44');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `incidencias`
--

CREATE TABLE `incidencias` (
  `id_incidencia` int(11) NOT NULL,
  `descripcion_problema` text NOT NULL,
  `estado` enum('ABIERTA','EN_PROCESO','CERRADA','CANCELADA') NOT NULL DEFAULT 'ABIERTA',
  `tipo_incidencia` enum('CORRECTIVO','PREVENTIVO','INSTALACION','OTRO') NOT NULL DEFAULT 'CORRECTIVO',
  `origen_incidencia` enum('USUARIO','SISTEMA','MANTENIMIENTO','OTRO') NOT NULL DEFAULT 'USUARIO',
  `prioridad` enum('BAJA','MEDIA','ALTA','CRITICA') NOT NULL DEFAULT 'MEDIA',
  `id_usuario` int(11) NOT NULL,
  `id_activo` int(11) NOT NULL,
  `creada_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `cerrada_en` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `incidencias`
--

INSERT INTO `incidencias` (`id_incidencia`, `descripcion_problema`, `estado`, `tipo_incidencia`, `origen_incidencia`, `prioridad`, `id_usuario`, `id_activo`, `creada_en`, `cerrada_en`) VALUES
(1, 'sdtrfdsfddsf', 'ABIERTA', 'PREVENTIVO', 'USUARIO', 'MEDIA', 2, 2, '2025-11-03 23:43:46', '0000-00-00 00:00:00'),
(2, 'de3535353453rew', 'CERRADA', 'OTRO', 'SISTEMA', 'MEDIA', 4, 3, '2025-11-05 17:09:23', '0000-00-00 00:00:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reportesbaja`
--

CREATE TABLE `reportesbaja` (
  `ID_Baja` int(11) NOT NULL,
  `Folio` varchar(20) NOT NULL,
  `ID_Activo` int(11) NOT NULL,
  `ElaboradoPor` int(11) NOT NULL,
  `AutorizadoPor` varchar(120) NOT NULL,
  `Procesador` text NOT NULL,
  `Fecha_Reimpresion` date DEFAULT NULL,
  `Fecha_Baja` date NOT NULL DEFAULT curdate(),
  `EvidenciaURL` varchar(255) DEFAULT NULL,
  `Tiempo_Uso` text DEFAULT NULL,
  `Memoria_Ram` text NOT NULL,
  `Almacenamiento` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `reportesbaja`
--

INSERT INTO `reportesbaja` (`ID_Baja`, `Folio`, `ID_Activo`, `ElaboradoPor`, `AutorizadoPor`, `Procesador`, `Fecha_Reimpresion`, `Fecha_Baja`, `EvidenciaURL`, `Tiempo_Uso`, `Memoria_Ram`, `Almacenamiento`) VALUES
(4, 'BAJ-20251105-000004', 3, 2, 'sdfdsfdsfds', 'fdsfdsfdsfs', '2025-11-06', '2025-11-05', '/incidencias/2/diagnostico/baja/pdf/6', 'sdfsdfdsfsd\nDiagnóstico relacionado #6', '', '');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

--
-- Volcado de datos para la tabla `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('F_bnBUuONVh3F-ekKD6e0bLuJmYmcygO', 1762700830, '{\"cookie\":{\"originalMaxAge\":7200000,\"expires\":\"2025-11-09T15:04:10.865Z\",\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"csrfSecret\":\"ecxwgG8FTwjMTGioenlWiZ3t\",\"user\":{\"id_usuario\":2,\"nombre\":\"Admin\",\"apellido\":\"Sistema\",\"correo\":\"admin@hotelarte.mx\",\"rol\":\"Administrador\"}}'),
('NGiW6itIRm9mkCYx6W1xqWx515uQgHo8', 1762587887, '{\"cookie\":{\"originalMaxAge\":7200000,\"expires\":\"2025-11-08T07:44:46.831Z\",\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"csrfSecret\":\"TLD-0ijRi56gLd3g_nGi71Ug\",\"user\":{\"id_usuario\":2,\"nombre\":\"Admin\",\"apellido\":\"Sistema\",\"correo\":\"admin@hotelarte.mx\",\"rol\":\"Administrador\"},\"diagnosticSignatures\":{}}'),
('QdqG_zTce97YUdZIa2a7PP-WrUMtUHyW', 1762480750, '{\"cookie\":{\"originalMaxAge\":7200000,\"expires\":\"2025-11-07T01:43:38.283Z\",\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"csrfSecret\":\"-RLYIGAM6mN0-CwZAXhgIegw\",\"user\":{\"id_usuario\":2,\"nombre\":\"Admin\",\"apellido\":\"Sistema\",\"correo\":\"admin@hotelarte.mx\",\"rol\":\"Administrador\"}}'),
('aNO1-RQmGo2IvrzETHggZdCNETWkn1wF', 1762479804, '{\"cookie\":{\"originalMaxAge\":7200000,\"expires\":\"2025-11-07T01:43:23.581Z\",\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"csrfSecret\":\"-FrgxMpV7bIHUFJ7i66nuRBH\"}');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `correo` varchar(180) NOT NULL,
  `rol` enum('Administrador','TECNICO','COLABORADOR','HUESPED','EXTERNO') NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `nombre`, `apellido`, `correo`, `rol`, `contrasena`, `creado_en`) VALUES
(1, 'Tech', 'Soporte', 'tech@xcaret.com', 'TECNICO', '1234', '2025-10-20 05:34:04'),
(2, 'Admin', 'Sistema', 'admin@hotelarte.mx', 'Administrador', 'Admin1234*', '2025-10-26 00:29:55'),
(4, 'Eider', 'mojon', 'alex@gmail.com', 'HUESPED', '1234', '2025-11-01 04:38:42');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `activos_fijos`
--
ALTER TABLE `activos_fijos`
  ADD PRIMARY KEY (`id_activo`),
  ADD KEY `fk_activo_usuario` (`id_usuario`),
  ADD KEY `fk_activo_area` (`id_area`),
  ADD KEY `fk_activo_categoria` (`id_categoria_activos`);

--
-- Indices de la tabla `areas`
--
ALTER TABLE `areas`
  ADD PRIMARY KEY (`id_area`),
  ADD KEY `fk_areas_departamento` (`id_departamento`);

--
-- Indices de la tabla `categorias_activos`
--
ALTER TABLE `categorias_activos`
  ADD PRIMARY KEY (`id_categoria_activos`);

--
-- Indices de la tabla `departamentos`
--
ALTER TABLE `departamentos`
  ADD PRIMARY KEY (`id_departamento`);

--
-- Indices de la tabla `historial`
--
ALTER TABLE `historial`
  ADD PRIMARY KEY (`id_historial`),
  ADD KEY `fk_historial_activo` (`id_activo`),
  ADD KEY `fk_historial_incidencia` (`id_incidencia`),
  ADD KEY `fk_historial_tecnico` (`id_usuario_tecnico`);

--
-- Indices de la tabla `incidencias`
--
ALTER TABLE `incidencias`
  ADD PRIMARY KEY (`id_incidencia`),
  ADD KEY `fk_incidencia_usuario` (`id_usuario`),
  ADD KEY `fk_incidencia_activo` (`id_activo`);

--
-- Indices de la tabla `reportesbaja`
--
ALTER TABLE `reportesbaja`
  ADD PRIMARY KEY (`ID_Baja`),
  ADD UNIQUE KEY `ID_Activo` (`ID_Activo`),
  ADD KEY `fk_baja_elaborado` (`ElaboradoPor`),
  ADD KEY `idx_baja_fecha` (`Fecha_Baja`),
  ADD KEY `idx_baja_autorizado` (`AutorizadoPor`);

--
-- Indices de la tabla `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `expires_idx` (`expires`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `activos_fijos`
--
ALTER TABLE `activos_fijos`
  MODIFY `id_activo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `areas`
--
ALTER TABLE `areas`
  MODIFY `id_area` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `categorias_activos`
--
ALTER TABLE `categorias_activos`
  MODIFY `id_categoria_activos` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `departamentos`
--
ALTER TABLE `departamentos`
  MODIFY `id_departamento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `historial`
--
ALTER TABLE `historial`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `incidencias`
--
ALTER TABLE `incidencias`
  MODIFY `id_incidencia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `reportesbaja`
--
ALTER TABLE `reportesbaja`
  MODIFY `ID_Baja` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `activos_fijos`
--
ALTER TABLE `activos_fijos`
  ADD CONSTRAINT `fk_activo_area` FOREIGN KEY (`id_area`) REFERENCES `areas` (`id_area`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_activo_categoria` FOREIGN KEY (`id_categoria_activos`) REFERENCES `categorias_activos` (`id_categoria_activos`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_activo_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `areas`
--
ALTER TABLE `areas`
  ADD CONSTRAINT `fk_areas_departamento` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `historial`
--
ALTER TABLE `historial`
  ADD CONSTRAINT `fk_historial_activo` FOREIGN KEY (`id_activo`) REFERENCES `activos_fijos` (`id_activo`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_historial_incidencia` FOREIGN KEY (`id_incidencia`) REFERENCES `incidencias` (`id_incidencia`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_historial_tecnico` FOREIGN KEY (`id_usuario_tecnico`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `incidencias`
--
ALTER TABLE `incidencias`
  ADD CONSTRAINT `fk_incidencia_activo` FOREIGN KEY (`id_activo`) REFERENCES `activos_fijos` (`id_activo`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_incidencia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `reportesbaja`
--
ALTER TABLE `reportesbaja`
  ADD CONSTRAINT `fk_baja_activo` FOREIGN KEY (`ID_Activo`) REFERENCES `activos_fijos` (`id_activo`),
  ADD CONSTRAINT `fk_baja_elaborado` FOREIGN KEY (`ElaboradoPor`) REFERENCES `usuarios` (`id_usuario`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
