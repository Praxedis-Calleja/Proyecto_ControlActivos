-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 15-11-2025 a las 00:44:16
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
  `fecha_garantia` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias_activos`
--

CREATE TABLE `categorias_activos` (
  `id_categoria_activos` int(11) NOT NULL,
  `nombre` varchar(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `departamentos`
--

CREATE TABLE `departamentos` (
  `id_departamento` int(11) NOT NULL,
  `nombre_departamento` varchar(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `diagnostico`
--

CREATE TABLE `diagnostico` (
  `id_diagnostico` int(11) NOT NULL,
  `id_activo` int(11) NOT NULL,
  `id_incidencia` int(11) DEFAULT NULL,
  `id_usuario_tecnico` int(11) DEFAULT NULL,
  `diagnostico` text DEFAULT NULL,
  `fecha_diagnostico` date DEFAULT NULL,
  `fecha_ingreso` date NOT NULL DEFAULT curdate(),
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `tiempo_uso` text NOT NULL,
  `procesador` text NOT NULL,
  `almacenamiento` text NOT NULL,
  `memoria_ram` text NOT NULL,
  `evidenciaURL` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `cerrada_en` timestamp NULL DEFAULT NULL,
  `nombre_contacto_externo` varchar(120) DEFAULT NULL,
  `tipo_contacto_externo` varchar(50) DEFAULT NULL,
  `datos_contacto_externo` varchar(120) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reportesbaja`
--

CREATE TABLE `reportesbaja` (
  `ID_Baja` int(11) NOT NULL,
  `ID_Activo` int(11) NOT NULL,
  `Fecha_Reimpresion` date DEFAULT NULL,
  `Fecha_Baja` date NOT NULL DEFAULT curdate(),
  `id_diagnostico` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

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
-- Indices de la tabla `diagnostico`
--
ALTER TABLE `diagnostico`
  ADD PRIMARY KEY (`id_diagnostico`),
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
  ADD KEY `idx_baja_fecha` (`Fecha_Baja`),
  ADD KEY `idx_baja_reimpresion` (`Fecha_Reimpresion`),
  ADD KEY `fk_diagnostico` (`id_diagnostico`);

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
  MODIFY `id_activo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `areas`
--
ALTER TABLE `areas`
  MODIFY `id_area` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `categorias_activos`
--
ALTER TABLE `categorias_activos`
  MODIFY `id_categoria_activos` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `departamentos`
--
ALTER TABLE `departamentos`
  MODIFY `id_departamento` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `diagnostico`
--
ALTER TABLE `diagnostico`
  MODIFY `id_diagnostico` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `incidencias`
--
ALTER TABLE `incidencias`
  MODIFY `id_incidencia` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reportesbaja`
--
ALTER TABLE `reportesbaja`
  MODIFY `ID_Baja` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT;

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
-- Filtros para la tabla `diagnostico`
--
ALTER TABLE `diagnostico`
  ADD CONSTRAINT `fk_diagnostico_activo` FOREIGN KEY (`id_activo`) REFERENCES `activos_fijos` (`id_activo`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_diagnostico_incidencia` FOREIGN KEY (`id_incidencia`) REFERENCES `incidencias` (`id_incidencia`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_diagnostico_tecnico` FOREIGN KEY (`id_usuario_tecnico`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_baja_diag` FOREIGN KEY (`id_diagnostico`) REFERENCES `diagnostico` (`id_diagnostico`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
