DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

CREATE TABLE regions (
  rname   VARCHAR(74) PRIMARY KEY
);

CREATE TABLE specializations (
  sname   VARCHAR(74) PRIMARY KEY,
  details VARCHAR(100),
  check (sname <> 'OTHER' OR details IS NOT NULL)
);

CREATE TABLE states (
  sname VARCHAR(74) PRIMARY KEY
);

CREATE TABLE classifications (
  cname VARCHAR(74) PRIMARY KEY
);

CREATE TABLE accounts(
  aid 		INTEGER PRIMARY KEY,
  email 	VARCHAR(74) UNIQUE,
  username 	VARCHAR(74) NOT NULL,
  password 	VARCHAR(74) NOT NULL
);

CREATE TABLE users(
  aid 		INTEGER,
  rname		VARCHAR(74),
  score   NUMERIC(2) DEFAULT 5.00,
  score_total NUMERIC(2) DEFAULT 0.00,
  score_count NUMERIC(2) DEFAULT 0.00,
  gender  VARCHAR(74),
  education VARCHAR(74),
  PRIMARY KEY (aid),
  FOREIGN KEY (aid)   REFERENCES accounts ON DELETE CASCADE,
  FOREIGN KEY (rname) REFERENCES regions
);

CREATE TABLE admins(
  aid 			   INTEGER PRIMARY KEY,
  FOREIGN KEY(aid) REFERENCES accounts ON DELETE CASCADE
);

CREATE TABLE specializes (
  aid		   INTEGER     REFERENCES users,
  sname		 VARCHAR(74) REFERENCES specializations,
  PRIMARY KEY  (aid, sname)
);

CREATE TABLE tasks(
  tid INTEGER PRIMARY KEY,
  title       VARCHAR(74),
  sname       VARCHAR(74) DEFAULT 'Unassigned' REFERENCES states,
  rname       VARCHAR(74) DEFAULT 'All' REFERENCES regions,
  cname       VARCHAR(74) DEFAULT 'All' REFERENCES classifications,
  finder_id   INTEGER REFERENCES users(aid) NOT NULL,
  salary      INTEGER NOT NULL,
  post_date   DATE NOT NULL,
  task_date   DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  description VARCHAR(200),
  tasker_id   INTEGER REFERENCES users(aid) ON DELETE CASCADE,
  check (tasker_id <> finder_id),
  check (start_time < end_time)
);

CREATE TABLE bids (
  tid       INTEGER REFERENCES tasks ON DELETE CASCADE,
  tasker_id INTEGER REFERENCES users ON DELETE CASCADE,
  salary    INTEGER NOT NULL,
  PRIMARY   KEY (tid, tasker_id)
);

CREATE TABLE reviews(
  tid         	INTEGER REFERENCES tasks,
  reviewer_id 	INTEGER NOT NULL REFERENCES users(aid) ON DELETE CASCADE,
  receiver_id 	INTEGER NOT NULL REFERENCES users(aid) ON DELETE CASCADE,
  score       	INTEGER NOT NULL,
  PRIMARY KEY (tid, reviewer_id, receiver_id),
  check(score >= 0 and score <= 5)
);

CREATE OR REPLACE FUNCTION update_score()
RETURNS TRIGGER AS $$
DECLARE t INTEGER;rv INTEGER; rc INTEGER; r INTEGER;
BEGIN t := NEW.tid; rv := NEW.reviewer_id; rc := NEW.receiver_id; r = NEW.score;
       IF EXISTS (SELECT 1 FROM tasks WHERE tid = t AND ((tasker_id = rv AND finder_id = rc) OR (tasker_id = rc AND finder_id = rv)))
            THEN UPDATE users SET score_count = score_count + 1 WHERE aid = rc;
                 UPDATE users SET score_total = score_total + r WHERE aid = rc;
                 UPDATE users SET score = score_total / score_count WHERE aid = rc;

            RETURN NEW;
       ELSE RETURN NULL;
       END IF;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER p_w_r
BEFORE INSERT ON reviews FOR EACH ROW
EXECUTE PROCEDURE update_score();


CREATE OR REPLACE FUNCTION trig_func()
RETURNS TRIGGER AS $$
BEGIN
DELETE FROM accounts
WHERE aid = OLD.aid;
RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER deleteAcc
AFTER DELETE ON users
FOR EACH ROW
EXECUTE PROCEDURE trig_func();

CREATE OR REPLACE FUNCTION bid_verify()
RETURNS TRIGGER AS $$
DECLARE new_score NUMERIC;
DECLARE min_score NUMERIC;
DECLARE min_bid NUMERIC;
BEGIN
  SELECT score INTO new_score
  FROM users
  WHERE users.aid = NEW.tasker_id;
  SELECT min(salary) INTO min_bid
  FROM bids;
  SELECT max(score) INTO min_score
  FROM users
  WHERE users.aid
  IN (SELECT tasker_id FROM bids WHERE bids.salary = min_bid);
  IF NEW.salary > min_bid AND new_score < min_score
    THEN RETURN NULL;
  ELSE
    RETURN NEW;
  END IF;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER bid
BEFORE INSERT OR UPDATE ON bids
FOR EACH ROW
EXECUTE PROCEDURE bid_verify();


INSERT INTO regions (rname) VALUES ('Kent Ridge');
INSERT INTO regions (rname) VALUES ('Buona Vista');
INSERT INTO regions (rname) VALUES ('Bugis');
INSERT INTO regions (rname) VALUES ('Marina Bay');
INSERT INTO regions (rname) VALUES ('Orchard');
INSERT INTO regions (rname) VALUES ('Jurong East');
INSERT INTO regions (rname) VALUES ('Changi Airport');
INSERT INTO regions (rname) VALUES ('Malaysia');
INSERT INTO regions (rname) VALUES ('Bishan');
INSERT INTO regions (rname) VALUES ('Holland Village');
INSERT INTO regions (rname) VALUES ('Yishun');
INSERT INTO regions (rname) VALUES ('Other');
INSERT INTO regions (rname) VALUES ('All');

INSERT INTO specializations (sname) VALUES ('Mandarin');
INSERT INTO specializations (sname) VALUES ('Highschool Mathemetics');
INSERT INTO specializations (sname) VALUES ('Singing');
INSERT INTO specializations (sname) VALUES ('Drawing');
INSERT INTO specializations (sname) VALUES ('English');
INSERT INTO specializations (sname) VALUES ('Cooking');
INSERT INTO specializations (sname) VALUES ('Driving');

INSERT INTO states (sname) VALUES ('Unassigned');
INSERT INTO states (sname) VALUES ('Ongoing');
INSERT INTO states (sname) VALUES ('Completed');
INSERT INTO states (sname) VALUES ('Failed');

INSERT INTO classifications (cname) VALUES ('Baby Sitting');
INSERT INTO classifications (cname) VALUES ('Tutor');
INSERT INTO classifications (cname) VALUES ('Horticulture');
INSERT INTO classifications (cname) VALUES ('Lifting');
INSERT INTO classifications (cname) VALUES ('Pets Caring');
INSERT INTO classifications (cname) VALUES ('Electrical');
INSERT INTO classifications (cname) VALUES ('Other');

INSERT INTO accounts (aid, email, username, password) VALUES (0,
'admin2102@gmail.com', 'admin2102', '$2b$10$M/lrxu2.2oqy3N6nalCgmOEd6Gwhn6VWqnNJE61pU3GBL8xK4F/h2');

INSERT INTO admins (aid) VALUES (0);