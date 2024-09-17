import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

import { TABLE } from "../constants/table";

@Entity(TABLE.UPLOADFILE)
export class Uploadfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  filePath: string;

  @Column({ type: "text" })
  fileName: string;

  @Column({ type: "decimal", nullable: true })
  createTimestamp: number;

  @Column({ nullable: true })
  episode: number;
}
