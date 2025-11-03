-- Esquema para la tabla de incidencias
CREATE TABLE IF NOT EXISTS Incidencias (
  id_incidencia INT AUTO_INCREMENT PRIMARY KEY,
  id_activo INT NOT NULL,
  id_area INT NOT NULL,
  id_departamento INT NOT NULL,
  id_reporta INT NOT NULL,
  id_tecnico_asignado INT DEFAULT NULL,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT NOT NULL,
  prioridad VARCHAR(20) NOT NULL,
  estado VARCHAR(20) NOT NULL,
  fecha_reporte DATE NOT NULL,
  fecha_resolucion DATE DEFAULT NULL,
  causa_raiz TEXT,
  acciones_realizadas TEXT,
  observaciones TEXT,
  CONSTRAINT fk_incidencia_activo FOREIGN KEY (id_activo) REFERENCES activos_fijos(id_activo),
  CONSTRAINT fk_incidencia_area FOREIGN KEY (id_area) REFERENCES Areas(id_area),
  CONSTRAINT fk_incidencia_departamento FOREIGN KEY (id_departamento) REFERENCES Departamentos(id_departamento),
  CONSTRAINT fk_incidencia_reporta FOREIGN KEY (id_reporta) REFERENCES Usuarios(ID_Usuario),
  CONSTRAINT fk_incidencia_tecnico FOREIGN KEY (id_tecnico_asignado) REFERENCES Usuarios(ID_Usuario)
);
