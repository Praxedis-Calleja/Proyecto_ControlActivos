-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: controlactivos
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activos_fijos`
--

DROP TABLE IF EXISTS `activos_fijos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `activos_fijos` (
  `id_activo` int(11) NOT NULL AUTO_INCREMENT,
  `marca` varchar(100) NOT NULL,
  `modelo` varchar(120) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_area` int(11) NOT NULL,
  `id_categoria_activos` int(11) NOT NULL,
  `estado` enum('ALMACEN','ASIGNADO','EN_REPARACION','PRESTAMO','BAJA') NOT NULL DEFAULT 'ALMACEN',
  `precio_lista` decimal(12,2) DEFAULT NULL,
  `fecha_compra` date DEFAULT NULL,
  `numero_serie` varchar(160) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `placa_activo` text NOT NULL,
  `propietario_nombre_completo` text NOT NULL,
  `propietario_contacto` text NOT NULL,
  `Fecha_Garantia` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_activo`),
  KEY `fk_activo_usuario` (`id_usuario`),
  KEY `fk_activo_area` (`id_area`),
  KEY `fk_activo_categoria` (`id_categoria_activos`),
  CONSTRAINT `fk_activo_area` FOREIGN KEY (`id_area`) REFERENCES `areas` (`id_area`) ON UPDATE CASCADE,
  CONSTRAINT `fk_activo_categoria` FOREIGN KEY (`id_categoria_activos`) REFERENCES `categorias_activos` (`id_categoria_activos`) ON UPDATE CASCADE,
  CONSTRAINT `fk_activo_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `areas`
--

DROP TABLE IF EXISTS `areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `areas` (
  `id_area` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_area` varchar(120) NOT NULL,
  `ubicacion` varchar(200) DEFAULT NULL,
  `id_departamento` int(11) NOT NULL,
  PRIMARY KEY (`id_area`),
  KEY `fk_areas_departamento` (`id_departamento`),
  CONSTRAINT `fk_areas_departamento` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categorias_activos`
--

DROP TABLE IF EXISTS `categorias_activos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categorias_activos` (
  `id_categoria_activos` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  PRIMARY KEY (`id_categoria_activos`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `departamentos`
--

DROP TABLE IF EXISTS `departamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `departamentos` (
  `id_departamento` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_departamento` varchar(120) NOT NULL,
  PRIMARY KEY (`id_departamento`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `historial`
--

DROP TABLE IF EXISTS `historial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `historial` (
  `id_historial` int(11) NOT NULL AUTO_INCREMENT,
  `id_activo` int(11) NOT NULL,
  `id_incidencia` int(11) DEFAULT NULL,
  `id_usuario_tecnico` int(11) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `diagnostico` text DEFAULT NULL,
  `fecha_diagnostico` date DEFAULT NULL,
  `fecha_ingreso` date NOT NULL DEFAULT curdate(),
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_historial`),
  KEY `fk_historial_activo` (`id_activo`),
  KEY `fk_historial_incidencia` (`id_incidencia`),
  KEY `fk_historial_tecnico` (`id_usuario_tecnico`),
  CONSTRAINT `fk_historial_activo` FOREIGN KEY (`id_activo`) REFERENCES `activos_fijos` (`id_activo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_historial_incidencia` FOREIGN KEY (`id_incidencia`) REFERENCES `incidencias` (`id_incidencia`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_historial_tecnico` FOREIGN KEY (`id_usuario_tecnico`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incidencias`
--

DROP TABLE IF EXISTS `incidencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `incidencias` (
  `id_incidencia` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion_problema` text NOT NULL,
  `estado` enum('ABIERTA','EN_PROCESO','CERRADA','CANCELADA') NOT NULL DEFAULT 'ABIERTA',
  `tipo_incidencia` enum('CORRECTIVO','PREVENTIVO','INSTALACION','OTRO') NOT NULL DEFAULT 'CORRECTIVO',
  `origen_incidencia` enum('USUARIO','SISTEMA','MANTENIMIENTO','OTRO') NOT NULL DEFAULT 'USUARIO',
  `prioridad` enum('BAJA','MEDIA','ALTA','CRITICA') NOT NULL DEFAULT 'MEDIA',
  `id_usuario` int(11) NOT NULL,
  `id_activo` int(11) NOT NULL,
  `creada_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `cerrada_en` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_incidencia`),
  KEY `fk_incidencia_usuario` (`id_usuario`),
  KEY `fk_incidencia_activo` (`id_activo`),
  CONSTRAINT `fk_incidencia_activo` FOREIGN KEY (`id_activo`) REFERENCES `activos_fijos` (`id_activo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_incidencia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reportesbaja`
--

DROP TABLE IF EXISTS `reportesbaja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reportesbaja` (
  `ID_Baja` int(11) NOT NULL AUTO_INCREMENT,
  `ID_Activo` int(11) NOT NULL,
  `ElaboradoPor` int(11) NOT NULL,
  `AutorizadoPor` varchar(120) NOT NULL,
  `Motivo` text NOT NULL,
  `Fecha_Diagnostico` date DEFAULT NULL,
  `Fecha_Baja` date NOT NULL DEFAULT curdate(),
  `EvidenciaURL` varchar(255) DEFAULT NULL,
  `Observaciones` text DEFAULT NULL,
  PRIMARY KEY (`ID_Baja`),
  UNIQUE KEY `ID_Activo` (`ID_Activo`),
  KEY `fk_baja_elaborado` (`ElaboradoPor`),
  KEY `idx_baja_fecha` (`Fecha_Baja`),
  KEY `idx_baja_autorizado` (`AutorizadoPor`),
  CONSTRAINT `fk_baja_activo` FOREIGN KEY (`ID_Activo`) REFERENCES `activos_fijos` (`id_activo`),
  CONSTRAINT `fk_baja_elaborado` FOREIGN KEY (`ElaboradoPor`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_generar_folio_baja

AFTER INSERT ON ReportesBaja

FOR EACH ROW

BEGIN

  UPDATE ReportesBaja

  SET Folio = CONCAT(

      'BAJ-',

      DATE_FORMAT(NEW.Fecha_Baja, '%Y%m%d'),

      '-',

      LPAD(NEW.ID_Baja, 6, '0')

  )

  WHERE ID_Baja = NEW.ID_Baja;

END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `expires_idx` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `correo` varchar(180) NOT NULL,
  `rol` enum('Administrador','TECNICO','COLABORADOR','HUESPED','EXTERNO') NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-03  0:36:45
