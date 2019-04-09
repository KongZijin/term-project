const sql_query = require('../sql');
const passport = require('passport');
const bcrypt = require('bcrypt')

// Postgre SQL Connection
const { Pool } = require('pg');
const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

const round = 10;
const salt  = bcrypt.genSaltSync(round);

const infinity = 2147483647;

var ranges = ["≤1000", "1000-2000", "2000-3000", "≥3000"];
var rangeNum = [[0, 1000], [1000, 2000], [2000, 3000], [3000, infinity]];
var date_last_ranges = ["last 3 days", "last one week", "last one month(30 days)"];
var date_next_ranges = ["next 3 days", "next one week", "next one month(30 days)"];

var gender_class = ["Female", "Male", "Others"];
var education_level = ['High School', 'College', 'Postgraduate', 'Other'];
var regions = ['Kent Ridge', 'Buona Vista', 'Bugis', 'Marina Bay', 'Orchard',
  'Jurong East', 'Changi Airport', 'Malaysia', 'Bishan', 'Holland Village', 'Yishun', 'Other'];

function initRouter(app) {
    console.log("connecting to the database: " + process.env.DATABASE_URL);

	/* GET */
    app.get('/', index);
    app.get('/index', index);
    app.get('/signup', signup);
    app.get('/login', login);
    app.get('/tasks/search', tasks_search);
    app.get('/tasks', tasks);
    //app.get('/post', post); need to remove because can only post if authenticated
    app.get('/details', passport.authMiddleware(), details);
	  app.get('/update_task', update_task);

    /* Protected GET */
    app.get('/post', passport.authMiddleware(), post);
    app.get('/profile', passport.authMiddleware(), profile);
    app.get('/dashboard', passport.authMiddleware(), dashboard);

    /* Admin pages */
    app.get('/admin', passport.authMiddleware(), admin);
    app.get('/view_users', passport.authMiddleware(), view_users);
    app.get('/view_tasks', passport.authMiddleware(), view_tasks);
    app.get('/view_user_details', passport.authMiddleware(), view_user_details);
    app.get('/view_task_details', passport.authMiddleware(), view_task_details);
    app.get('/delete_user', passport.authMiddleware(), delete_user);
    app.get('/delete_task', passport.authMiddleware(), delete_task);

    /* PROTECTED POST */
    app.post('/receive_post', passport.authMiddleware(), receive_post);
    app.post('/update_acc_info', passport.authMiddleware(), update_acc_info);
    app.post('/update_user_info', passport.authMiddleware(), update_user_info);
    app.post('/update_pass', passport.authMiddleware(), update_pass);
    app.post('/review', passport.authMiddleware(), review);

    /* Sign Up */
    app.post('/receive_signup', receive_signup);

    /* Login */
    app.post('/receive_login', receive_login);

    /* Logout */
    app.get('/logout', passport.authMiddleware(), logout);

    /* Post */
    app.post('/details/bid', passport.authMiddleware(), bid);
	  app.post('/details/select_bid', passport.authMiddleware(), select_bid);
	  app.post('/details/system_select', passport.authMiddleware(), system_select);
}

function admin(req,res, next) {
  req.render('admin', { title: 'Welcome', auth: true });
}

/* Basic Info used for profile.*/
function basic(req, res, page, other) {
  var info = {
    page: page,
    rname: req.body.rname,
    gender : req.body.gender,
    user: req.user.aid,
  };
  if(other) {
    for(var fld in other) {
      info[fld] = other[fld];
    }
  }

  res.render(page, info);
}

/* User can view and update his own profile page. */
function profile(req, res, next) {
    pool.query(sql_query.query.get_user_info, [req.user.aid], (err, data) => {
        if (err) {
            console.log("cannot load profile");
        } else {
            var info = {
                acc_email: req.user.email,
                acc_username: req.user.username,
                user_info: data.rows[0],
                education_level: education_level,
                regionData: regions,
                gender_class: gender_class,
                info_msg: msg(req, 'info', 'Information updated successfully', 'Error in updating information'),
                pass_msg: msg(req, 'pass', 'Password updated successfully', 'Error in updating password'),
                auth:true,
            };
            basic(req, res, 'profile', info);
      }
    })
}

function query(req, fld) {
  return req.query[fld] ? req.query[fld] : '';
}
function msg(req, fld, pass, fail) {
  var info = query(req, fld);
  console.log("info"+info);
  return info ? (info=='pass' ? pass : fail) : '';
}

/* Admin can view all the users. */
function view_users(req, res, next) {
    pool.query(sql_query.query.admin_view_users, (err, data) => {
        if (err) {
            console.log("Error encountered when admin trying to view all"
                + " users.");
        } else {
            basic(req, res, 'view_users', {title: "Users", page: '', users_list: data.rows, auth: true});
      }
    });
}

function view_user_details(req, res, next) {
    if (req.query.aid == undefined) {
      console.log(req.query.tid);
      // get user from task
      pool.query(sql_query.query.view_bidder, [req.query.tid], (err, data1) => {
        pool.query(sql_query.query.admin_get_user_tasks, [data1.rows[0].aid], (err, data2) => {
          if (err) {
            console.log(err);
            console.log("Error encountered when requesting  user"
                + " details.");
          } else {
            basic(req, res, 'view_user_details', {title: "Task Details", auth: true, user: data1.rows, tasks: data2.rows})
          }
        })
      })

    } else {
      pool.query(sql_query.query.admin_get_user_details, [req.query.aid] , (err, data1) => {
        pool.query(sql_query.query.admin_get_user_tasks, [req.query.aid], (err, data2) => {
          if (err) {
            console.log(err);
            console.log("Error encountered when requesting  user"
                + " details.");
          } else {
            basic(req, res, 'view_user_details', {title: "Task Details", auth: true, user: data1.rows, tasks: data2.rows})
          }
        })
      });
    }
}

/* Admin can view all the tasks. */
function view_tasks(req, res, next) {
  pool.query(sql_query.query.admin_view_tasks, (err, data) => {
    if (err) {
      console.log("Error encountered when admin trying to view all"
          + " users.");
    } else {
      basic(req, res, 'view_tasks', {title: "Tasks", page: '', tasks_list: data.rows, auth: true });
    }
  });
}

function view_task_details(req, res, next) {
  pool.query(sql_query.query.admin_get_task_details, [req.query.tid] , (err, data1) => {
    console.log(data1.rows[0], req.query.tid);
    pool.query(sql_query.query.admin_get_tasker_info, [data1.rows[0].tasker_id], (err, data2) => {
      if (err) {
        console.log(err);
        console.log("Error encountered when requesting task detail.")
      } else {
        basic(req, res, 'view_task_details', {title: "Task Details", auth: true, task: data1.rows, tasker: data2.rows})
      }
    })
  });
}


function index(req, res, next) {
    pool.query(sql_query.query.get_task_type, (err, data) => {
        if(err) {
            console.log("Error encountered when reading classifications");
        } else {
            if(!req.isAuthenticated()) {
                console.log("not authenticated yet.");
            	res.render('index', { title: 'Homepage' , page: '', auth: false, types: data.rows});
            } else {
            	console.log(req.user.aid + " has logged in!");
            	basic(req, res, 'index', { title: 'Homepage', page: '', auth: true, types: data.rows});
            }
        }
    });
}

function tasks_search(req, res, next) {
    var keyword = "%" + req.query.keyword + "%";
    console.log(keyword);
    pool.query(sql_query.query.search, [keyword], (err, data) => {
        if(err) {
            console.log("Error encountered when searching");
            index(req, res, next);
        } else {
            show(req, res, data);
        }
    });
}

function tasks(req, res, next) {
    var all_types = 'false';
    var all_regions = 'false';
    var type = isEmpty(req.query.type, "Type") ? all_types = 'true' : req.query.type;
    var region = isEmpty(req.query.region, "Region") ? all_regions = 'true' : req.query.region;
    var task_date = isEmpty(req.query.task_date, "Task Date") ? getDate(new Date()) : getDate(req.query.date);
    var post_date = isEmpty(req.query.post_date, "Post Date") ? getDate(new Date()) : getDate(req.query.date);
    var range = isEmpty(req.query.range, "Salary") ? [0, infinity] : rangeNum[ranges.indexOf(req.query.range)];

    pool.query(sql_query.query.search, ["%%"], (err, data) => {
        if(err) {
            console.log("Error encountered when searching");
            index(req, res, next);
        } else {
            pool.query(sql_query.query.filter, [range[0], range[1], task_date, post_date, region, type, all_regions, all_types], (err, data) => {
                if(err) {
                    console.log("Error encountered when filtering");
                    index(req, res, next);
                } else {
                    show(req, res, data);
                }
            });
        }
    });
}

function isEmpty(input, placeHolder) {
    return input === "" || input === placeHolder || typeof input === "undefined";
}

function getDate(choice) {
    var currentDate = new Date();
    var resultDate = currentDate;
    console.log(currentDate);
    switch (choice) {
    case date_last_ranges[0]:
        resultDate = new Date(resultDate.setDate(currentDate.getDate()-3));
        break;
    case date_last_ranges[1]:
        resultDate = new Date(resultDate.setDate(currentDate.getDate()-7));
        break;
    case date_last_ranges[2]:
        resultDate = new Date(resultDate.setDate(currentDate.getDate()-30));
        break;
    }
    return resultDate.getUTCFullYear() + "-" + (resultDate.getUTCMonth() + 1) + "-" + resultDate.getUTCDate();
}

function getFormattedDate(date) {
    return date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate();
}

function show(req, res, data1) {
    var selectedType = isEmpty(req.query.type, "Type") ? "Type" : req.query.type;
    var selectedRegion = isEmpty(req.query.region, "Region") ? "Region" : req.query.region;
    var selectedPostDate = isEmpty(req.query.date, "Post Date") ? "Post Date" : req.query.date;
    var selectedTaskDate = isEmpty(req.query.date, "Task Date") ? "Task Date" : req.query.date;
    var selectedRange = isEmpty(req.query.range, "Salary") ? "Salary" : ranges[ranges.indexOf(req.query.range)];

    pool.query(sql_query.query.get_task_type, (err, data2) => {
        if(err) {
            console.log("Error encountered when reading classifications");
        } else {
            pool.query(sql_query.query.get_region, (err, data3) => {
                if(err) {
                    console.log("Error encountered when reading regions");
                } else {
                    var isAuth = req.isAuthenticated();
                    var tasks_info = {
                        task_date: data1.rows.map(row => getFormattedDate(row.task_date)),
                        post_date: data1.rows.map(row => getFormattedDate(row.post_date))
                    };
                    var info = {
                        tasks: data1.rows,
                        formatted_info: tasks_info,
                        type: selectedType,
                        region: selectedRegion,
                        postDate: selectedPostDate,
                        taskDate: selectedTaskDate,
                        range: selectedRange,
                        types: data2.rows,
                        regions: data3.rows,
                        task_dates: date_next_ranges,
                        post_dates: date_last_ranges,
                        ranges: ranges,
                        auth: isAuth
                    };
                    if (isAuth) {
                        basic(req, res, 'tasks', info);
                    } else {
                        res.render('tasks', info);
                    }
                }
            });
        }
    });
}

function update_task(req, res, next) {
	var date = new Date();
	var tid = Number(req.query.tid);

	pool.connect((err, client, done) => {
		function abort(err) {
			if(err) {
				client.query('ROLLBACK', function(err) { done(); });
				return true;
			}
			return false;
		}
		client.query('BEGIN', (err, res1) => {
			if(abort(err)) {
                console.log(err);
                return;
            };
            client.query(sql_query.query.get_task, [tid], (err, res2) => {
				var task = res2.rows[0];
				if (task.task_date >= date) {
					client.query('ROLLBACK', function(err) {
						console.log("Nothing to update.");
						res.redirect('/details?tid=' + tid);
					});
					return;
				} else {
					if (task.sname == 'Unassigned') {
						client.query(sql_query.query.select_failed, [tid], (err, res3) => {
							if(abort(err)) {
								console.log(err);
								return;
							};
							client.query('COMMIT', function(err, res4) {
								console.log("Task passed without being assigned.");
								if(abort(err)) {
									console.log(err);
									return;
								};
								res.redirect('/details?tid=' + tid);
								return;
							});
						});
					}
					client.query(sql_query.query.set_completed, [tid], (err, res3) => {
						if(abort(err)) {
							console.log(err);
							return;
						};
						client.query('COMMIT', function(err, res4) {
							console.log(5);
							if(abort(err)) {
								console.log(err);
								return;
							};
							console.log("Task has been completed.");
							res.redirect('/details?tid=' + tid);
							return;
						});
					});
				}
			});
		});
	});

}

function details(req, res, next) {
    pool.query(sql_query.query.get_detail, [req.query.tid] , (err, data) => {
        console.log(sql_query.query.get_detail, req.query.tid);
        if (err) {
            console.log(err);
            console.log("Error encountered when requesting task detail.");
        } else {
            var format_task_date = data.rows.map((row) => getFormattedDate(row.task_date));
            console.log(req.user.aid, data.rows[0].finder_id);
			if (req.user.aid != data.rows[0].finder_id && data.rows[0].sname == 'Unassigned') {
            	basic(req, res, 'details', {
					title: "Task Details",
					auth: req.isAuthenticated(),
					task: data.rows,
					formatted_task_date: format_task_date,
					section: 1
				});
			} else if (req.user.aid == data.rows[0].finder_id && data.rows[0].sname == 'Unassigned') {
				pool.query(sql_query.query.get_bidders_for_task, [req.query.tid], (err, data1) => {
					console.log(sql_query.query.get_bidders_for_task, req.query.tid);
					if (err) {
						console.error("Cannot get bidders for the task.");
					} else {
						basic(req, res, 'details', {
							title: "Task Details",
							auth: req.isAuthenticated(),
							task: data.rows,
							formatted_task_date: format_task_date,
							bidders: data1.rows,
							section: 2
						});
					}
				});
			} else if (data.rows[0].sname == 'Ongoing' || data.rows[0].sname == 'Completed') {
			    pool.query(sql_query.query.get_bidder_for_task, [req.query.tid], (err,data2)=>{
            	    if (err) {
            		    console.error("Cannot get bidder for the task.");
            		} else {
            		    pool.query(sql_query.query.get_posted_reviews, [req.query.tid, req.user.aid], (err, data3) => {
            		        if (err) {
            		            console.log("unexpected err");
            		        } else {
            		        var sec_id = 3;
                            if(req.user.aid == data.rows[0].finder_id || req.user.aid == data.rows[0].tasker_id) {
                                if( data.rows[0].sname == 'Ongoing') {
                                    sec_id = 4;
                                } else if (data.rows[0].sname == 'Completed' && data3.rows.length==0) {
                                    sec_id = 5;
                                } else {}
                            } else {}
                            basic(req, res, 'details', {
                                title: "Task Details",
                                auth: req.isAuthenticated(),
                                task: data.rows,
                                bidder: data2.rows,
                                formatted_task_date: format_task_date,
                                section: sec_id});
            		        }
            		    });
            		}
            	});
			} else {
                basic(req, res, 'details', {
                	title: "Task Details",
                	auth: req.isAuthenticated(),
                	task: data.rows,
                	formatted_task_date: format_task_date,
                	section: 6
                });

			}
		}
    });
}

function login(req, res, next) {
    res.render('login', { title: 'LogIn', auth: false});
}

function signup(req, res, next) {
    pool.query(sql_query.query.get_region, (err, data) => {
        res.render('signup', { title: 'SignUp' , regionData: data.rows, auth: false});
    });
}

// POST
function bid(req, res, next) {
    var bid = Number(req.body.bid);
    var tid = Number(req.body.tid);
    var tasker = req.user.aid;

    pool.connect((err, client, done) => {
        function abort(err) {
            if(err) {
                client.query('ROLLBACK', function(err) { done(); });
                return true;
            }
            return false;
        }

        client.query('BEGIN', (err, res1) => {
            if(abort(err)) {
                console.log(err);
                return;
            };
            client.query(sql_query.query.delete_bid, [tid, tasker], function(err, res2) {
                if(abort(err)) {
                    console.log(err);
                    return;
                };
                client.query(sql_query.query.insert_bid, [tid, tasker, bid], function(err, res3) {
                    if(abort(err)) {
                        console.log(err);
                        return;
                    }
                    client.query('COMMIT', function(err, res4) {
                        console.log(5);
                        if(abort(err)) {
                            console.log(err);
                            return;
                        };
                        res.redirect('/details?tid=' + tid);
                    });
                });
            });
        });
    });
}

function delete_user(req, res, next) {
  var aid = req.query.aid;
  pool.query(sql_query.query.admin_delete_user, [aid], (err, data) => {
    console.log(aid)
    if (err) {
      console.log("Error in delete user");
      res.redirect('/view_users?fail');
    } else {
      res.redirect('/view_users?success');
    }
  })
}

function delete_task(req, res, next) {
  var tid = req.query.tid;
  pool.query(sql_query.query.admin_delete_task, [tid], (err, data) => {
    console.log(tid)
    if (err) {
      console.log("Error in delete task");
      res.redirect('/view_tasks?fail');
    } else {
      res.redirect('/view_tasks?success');
    }
  })
}

function update_acc_info(req, res, next) {
    var aid = req.user.aid;
    var newname = req.body.username;
    pool.query(sql_query.query.update_acc_info, [aid, newname], (err, data) => {

        if(err) {
            console.error("Error in update info");

            res.redirect('/profile?user=' + aid + "?info=fail");
        } else {
            res.redirect('/profile?user=' + aid + "?info=pass");

        }
    });
}

function update_user_info(req, res, next) {
  var aid = req.user.aid;
  var gender = req.body.gender;
  var rname  = req.body.rname;
  var education = req.body.education;
  console.log("aid:" + aid + " gender: " + gender + " rname: " + rname + " education: " + education);
  pool.query(sql_query.query.update_user_info, [aid, gender, rname, education], (err, data) => {
    console.log(err);
    if(err) {
      console.error("Error in update user info");
      res.redirect('/profile?user=' + aid + "?info=fail");
    } else {
      res.redirect('/profile?user=' + aid + "?info=pass");
}
});
}

function update_pass(req, res, next) {
  var aid = req.user.aid;
  var password = bcrypt.hashSync(req.body.password, salt);
  pool.query(sql_query.query.update_pass, [aid, password], (err, data) => {
    if(err) {
      console.error("Error in update pass");
      res.redirect('/profile?user=' + aid + "?pass=fail");
    } else {
      res.redirect('/login?pass=pass');
}
});
}


function receive_signup(req, res, next) {
    //add sign up information into the database
    var aid;
    pool.query(sql_query.query.get_user_num, (err, data) => {
        if(err){
            console.log("cannot read the number");
            res.redirect('/');
        }else{
            aid = parseInt(data.rows[0].num, 10);
            var email = req.body.email;
            var username = req.body.username;
            var region = req.body.region;
            var password = req.body.password;
            var password_confirm = req.body.password_confirm;

            if (password.localeCompare(password_confirm) != 0) {
                // if the password and the confirmed password not match
                // reload the sign up page
                console.error("passwords not match");
                signup(req, res, next);
            } else {
                password = bcrypt.hashSync(password, salt);
                pool.query(sql_query.query.add_account, [aid, email, username, password], (err, data) => {
                    if(err) {
                        console.error("Cannot add the account");
                        res.redirect('/');
                    } else {
                        pool.query(sql_query.query.add_user, [aid, region], (err, data) => {
                            if(err) {
                                console.error("Cannot add the user");
                                res.redirect('/');
                            } else {
                                res.redirect('/login');
                            }
                        });
                    }
                });
            }
        }
    });

}


function receive_login(req, res, next){
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return next(err);
        }

        if (!user) {
            return res.redirect('/login');
        }

        req.logIn(user, function(err) {
            if (err) {
                return next(err);
            }
            console.log(user);
            pool.query(sql_query.query.check_if_admin, [user.aid], (err, data) => {
              console.log(data)
              if (data.rows.length == 0) {
                console.log("You are not admin.");
                return res.redirect('/?user=' + user.aid);
              } else {
                console.log("You are admin. Congrats.");
                return basic(req, res, 'admin', { title:"Welcome", types: data, auth: true});
              }
            });

        });
    })(req, res, next);
}

function logout(req, res, next){
    req.session.destroy()
    req.logout()
    res.redirect('/')
}

function post(req, res, next) {
	pool.query(sql_query.query.get_task_type, (err, data1) => {
		if(err) {
			console.log("Error encountered when reading classifications");
			res.redirect('/');
		} else {
			pool.query(sql_query.query.get_region, (err, data2) => {
				if (err) {
					console.log("Error encountered when reading regions");
					res.redirect('/');
				}else {
					var page = {
					title:"Post New Task",
					types: data1.rows,
					regionData:data2.rows,
					auth: true,
					info_msg: msg(req, 'info', "", "This task cannot be posted due to error in inputs")
					}
				basic(req, res, 'post', page);
				}
			})
		}
	})
}

function receive_post(req, res, next) {
	//add new task into the database
	var tid;
	pool.query(sql_query.query.get_task_num, (err, data) => {
		if(err){
			console.log("cannot read task number");
			res.redirect('/');
		} else {
			tid = parseInt(data.rows[0].num, 10);
			var title = req.body.title;
			var rname = req.body.region;
			var cname = req.body.type;
			var finder_id = req.user.aid; //to be updated with the user id from the session
			var salary = parseInt(req.body.salary);
			var desc = req.body.desc;
			var date = new Date(req.body.date);
			var start_time = req.body.start_hour + ":" + req.body.start_minute;
			var end_time = req.body.end_hour + ":" + req.body.end_minute;

			var today = new Date()
			var today_date = getFormattedDate(today);

			if (date < today) {
				console.error("This date has already passed.");
				res.redirect('/post?info=fail');
			} else {
				var datestring = getFormattedDate(date);
				pool.query(sql_query.query.add_task, [tid, title, rname, cname, finder_id, salary, today_date, datestring,start_time, end_time, desc], (err, data) => {
					if(err) {
					  console.log(err);
            console.log(data);
						console.error("Cannot add the task");
						res.redirect('/post?info=fail');
					} else {
						res.redirect('/');
					}
				});
			}
		}
	})
}


function select_bid(req,res,next) {
	//select a bidder manually
	var tid = Number(req.body.tid);
	var tasker = Number(req.body.bidder_id);
	var salary = Number(req.body.salary);
	pool.query(sql_query.query.select_bid, [tid, tasker, salary], (err, data) => {
		if (err) {
			console.log(req.body.tid, req.body.bidder_id, req.body.salary);
			console.log("cannot select bidder.");
			res.redirect('/details?tid='+ tid);
		} else {
			res.redirect('/details?tid=' + tid);
		}
	});
}

function system_select(req, res, next) {
	var tid = Number(req.body.tid);
	pool.connect((err, client, done) => {
		function abort(err) {
			if(err) {
				client.query('ROLLBACK', function(err) { done(); });
				return true;
			}
			return false;
		}
		client.query('BEGIN', (err, res1) => {
            if(abort(err)) {
                console.log(err);
                return;
            };
			client.query(sql_query.query.get_min_bidder_for_task, [tid], function(err, res2) {
                if(abort(err)) {
                    console.log(err);
                    return;
                };
				var bidder = res2.rows[0];
				console.log(bidder);
				if (typeof bidder == "undefined") {
					var today = new Date();
					var date =  new Date(req.body.date);
					if (date < today) {
						client.query(sql_query.query.select_failed, [tid], function(err, res3) {
							if(abort(err)){
								console.log(err);
								return;
							}
							client.query('COMMIT', function(err, res4) {
								console.log(5);
								if(abort(err)) {
									console.log(err);
									return;
								};
								res.redirect('/details?tid=' + tid);
							});
						});
					}
					client.query('ROLLBACK', function(err) {
						console.log("No bidder to select.");
						res.redirect('/details?tid=' + tid);
					});
				} else {
					var salary = Number(bidder.salary);
					var tasker = Number(bidder.tasker_id);
					client.query(sql_query.query.select_bid, [tid, tasker, salary], function(err, res5) {
						if(abort(err)){
							console.log(err);
							return;
						}
						client.query('COMMIT', function(err, res6) {
							console.log(5);
							if(abort(err)) {
								console.log(err);
								return;
							};
							res.redirect('/details?tid=' + tid);
						});
					});
				}
			});
		});
	});

}

function dashboard(req, res, next) {
    var aid = req.user.aid;
    pool.query(sql_query.query.get_posted_tasks, [aid], (err, data) => {
        if(err){
            console.log("here1");
            console.log("cannot select posted tasks.");
            res.redirect('/profile');
        }else{
            var posted = data.rows;
            console.log("can get posted tasks");
            pool.query(sql_query.query.get_assigned_tasks, [aid], (err, data2) => {
                if(err){
                    console.log("here2");
                    console.log("cannot select assigned tasks.");
                    res.redirect('/profile');
                }else{
                    var assigned = data2.rows;
                    pool.query(sql_query.query.get_bidding_tasks, [aid], (err, data3) => {
                        if(err){
                            console.log("here3");
                            console.log("cannot select bidding tasks.");
                            res.redirect('/profile');
                        }else{
                             var bidding = data3.rows;
                             basic(req, res, 'dashboard', {posted_tasks: posted, assigned_tasks: assigned, bidding_tasks: bidding, auth: true});
                        }
                    });
                }
            });
        }
    });
}

function review(req, res, next) {
    var tid = req.body.tid;
    var reviewer = req.user.aid;
    var receiver = req.body.totalid - reviewer;
    var rating = req.body.rating;
    pool.query(sql_query.query.add_review, [tid, reviewer, receiver, rating], (err, data) => {
        if (err) {
            console.log("cannot add review");
        } else {}
    });
    res.redirect('/dashboard');
}

module.exports = initRouter;
