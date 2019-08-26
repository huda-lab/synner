drop table Domains_Info;

create table Domains_Info (
  domain primary key references sqlite_master (tbl_name),
  ordernum int,
  category text,
  readeable_name text,
  description text
);