import { IsString } from 'class-validator';

export class MergeTableDto {
  /// The table whose open items move onto this table (e.g. a party of two
  /// grows and needs the neighboring table too, or moves entirely).
  @IsString()
  intoTableId!: string;
}
