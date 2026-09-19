import { Migration } from '@mikro-orm/migrations';

export class Migration20260919020000 extends Migration {
  override up(): void {
    this.addSql(`
      with missing_choices as (
        select vd.id as vote_detail_id
        from vote_details vd
        where vd.type = 'YES_NO'
          and not exists (
            select 1 from candidates c where c.vote_detail_id = vd.id
          )
      )
      insert into candidates
        (id, vote_detail_id, candidate_no, name, description, status, created_at, updated_at)
      select gen_random_uuid(), missing_choices.vote_detail_id,
             choice.candidate_no, choice.name, '', 'ACTIVE', now(), now()
      from missing_choices
      cross join (values (1, '찬성'), (2, '반대')) as choice(candidate_no, name)
      on conflict (vote_detail_id, candidate_no) do nothing;
    `);
  }

  override down(): void {
    // Keep choices because ballots may already contain votes for them.
  }
}
