import {
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";

import { TABLE } from "../constants/table";
import { WorkFromHome } from "./wfh.entity";

@Entity(TABLE.USERQUIZ)
export class UserQuiz {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text", nullable: true })
  quizId: number;

  @Column({ type: "text", nullable: true })
  userId: string;

  @Column({ nullable: true })
  correct: boolean;

  @Column({ nullable: true })
  answer: number;

  @Column({ nullable: true, type: "decimal", default: Date.now() })
  createAt: number;

  @Column({ nullable: true, type: "decimal" })
  updateAt: number;
}
