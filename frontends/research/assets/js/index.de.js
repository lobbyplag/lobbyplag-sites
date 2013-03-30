var lobbyplag = {
	data: {},
	route: {
		default: 'compare',
		hash: '',
		current: '',
		sub: '',
		subroute: '',
		proposed: ''
	},
	load: function(){
		$.getJSON('data/2012-0011-cod.lobby.de.json', function($lobby){
			$.extend(lobbyplag.data, $lobby);
			$.getJSON('data/2012-0011-cod.amendments.json', function($amendments){
				$.extend(lobbyplag.data, $amendments);
				lobbyplag.data.index = {
					'amendments': {},
					'plags': {},
					'problems': {},
					'lobbyists': {},
					'sources': {}
				};
				lobbyplag.data.stats = {
					'authors': {},
					'amendments': {}
				};
				$(lobbyplag.data.authors).each(function(idx, e){
					lobbyplag.data.stats.authors[e] = 0;
					lobbyplag.data.stats.amendments[e] = [];
				});
				$(lobbyplag.data.amendments).each(function(idx, e){
					lobbyplag.data.index.amendments[e.uid] = idx;
					$(e.authors).each(function(idx,f){
						lobbyplag.data.stats.amendments[f].push(e.uid);
					});
				});
				$(lobbyplag.data.plags).each(function(idx, e){
					lobbyplag.data.index.plags[e.id] = idx;
				});
				$(lobbyplag.data.problems).each(function(idx, e){
					lobbyplag.data.index.problems[e.id] = idx;
				});
				$(lobbyplag.data.lobbyists).each(function(idx, e){
					lobbyplag.data.index.lobbyists[e.id] = idx;
					lobbyplag.data.lobbyists[idx].sources = [];
				});
				$(lobbyplag.data.sources).each(function(idx, e){
					lobbyplag.data.index.sources[e.id] = idx;
					$(e.lobbyists).each(function(idy,lobbyist){
						lobbyplag.data.lobbyists[lobbyplag.data.index.lobbyists[lobbyist]].sources.push(idx);
					});
				});
				$(lobbyplag.data.plags).each(function(idx,e){
					$(e.amendments).each(function(idx,e){
						$(lobbyplag.data.amendments[lobbyplag.data.index.amendments[e]].authors).each(function(idx,e){
							lobbyplag.data.stats.authors[e]++;
						});
					});
				});
				$(document).ready(function(){
					lobbyplag.ready();
				});
			});
		});
	},
	ready: function(){
		
		/* initialize the overlay */
		(function(){
			$('body').append($('<div id="overlay-container"><div id="overlay"><h1>Comparison</h1><div id="overlay-content"></div><p><a href="javascript:;" class="overlay-close btn btn-medium btn-primary">Close</a></p></div></div>'));
			var $clickIn = false;
			$('.overlay-close', '#overlay-container').click(function(evt){
				$('#overlay-container').fadeOut('fast');
				location.hash = location.hash.split('/#/').shift();
			});
			$('#overlay').click(function(evt){
				$clickIn = true;
			});
			$('#overlay-container').click(function(evt){
				if (!$clickIn) {
					$('#overlay-container').fadeOut('fast');
					location.hash = location.hash.split('/#/').shift();
				}
				$clickIn = false;
			});
		})();
		
		/* enable social links */
		
		/*
		
		$('#share-twitter').click(function(){
			window.open($(this).attr('href'), "share", "width=500,height=300,status=no,scrollbars=no,resizable=no,menubar=no,toolbar=no");	
		});
		$('#share-facebook').click(function(){
			window.open($(this).attr('href'), "share", "width=500,height=300,status=no,scrollbars=no,resizable=no,menubar=no,toolbar=no");	
		});
		$('#share-google').click(function(){
			window.open($(this).attr('href'), "share", "width=500,height=300,status=no,scrollbars=no,resizable=no,menubar=no,toolbar=no");	
		});
		
		*/

		$('.share-pop', '#social').click(function(evt){
			evt.preventDefault();
			window.open($(this).attr('href'), "share", "width=500,height=300,status=no,scrollbars=no,resizable=no,menubar=no,toolbar=no");
			return false;
		});
		
		/* catchall popover closer */
		$(document).click(function(e) {
			if(window.popover_visible & window.popover_away) {				
				$('.display-person .person-name, .problem-link').popover('hide');
				window.popover_visible = window.popover_away = false
			} else {
				window.popover_away = true
			}
		});
		
		/* watch out for hash changes */
		if ("onhashchange" in window && (!document.documentMode || document.documentMode >= 8)) {
			window.onhashchange = lobbyplag.router;
		} else {
			/* stupid inernet explorer */
			setInterval(function(){
				lobbyplag.router();
			}, 100);
		}
		
		lobbyplag.router();
		
	},
	routes: {
		compare: function(s) {
			
			/* split up sub */
			
			if (s) {
				var subparts = s.split('/');
				var sub = subparts[0];
				lobbyplag.route.subroute = sub;
			} else {
				var sub = null;
				var subparts = [];
			}
			
			/* show spinner */
			
			$('#compare-action').html('<div class="spinner"></div>');
			
			/* update navigation */
			
			$('li', '#nav-compare').removeClass('active');
			if (sub === '' || sub === null) {
				$('a[href*=overview]', '#nav-compare').parent().addClass('active');
			} else {
				$('a[href*='+sub+']', '#nav-compare').parent().addClass('active');
			}
			
			if (!sub || '#/overview/'+sub !== location.hash.split('/#/').shift()) {
			
				switch(sub) {
					case "committee-members":
					
						var $table = $('<table class="table committee-members"><thead><tr><th>Committee member</th><th>Country</th><th>Group</th><th>Amendments</th><th>Links</th></tr></thead><tbody></tbody></table>');

						$(lobbyplag.data.authors.sort()).each(function(idx,identifier){
					
							var person = lobbyplag.data.persons[identifier];
						
							var $row = $('<tr></tr>');
						
							$row.append($('<td class="name"></td>').append(person.name));
							$row.append($('<td class="country"></td>').append(lobbyplag.data.countries[person.country]));
							$row.append($('<td class="group"></td>').append('<abbr title="'+lobbyplag.data.groups[person.group]['long']+'">'+lobbyplag.data.groups[person.group]['short']+'</abbr>'));
						
							/* don't!
							var $proposals = $('<td></td>');
							$(lobbyplag.data.stats.amendments[identifier]).each(function(idx,uid){
								$proposals.append(lobbyplag.helper.amendment(uid));
							});
							$row.append($proposals);
							*/
						
							$row.append($('<td class="amendments"></td>').append('<span title="With lobby contents" class="with">'+lobbyplag.data.stats.authors[identifier]+'</span>/<span title="Total">'+lobbyplag.data.authors_count[identifier]+'</span> <span title="Percentage of lobby content">('+(((lobbyplag.data.stats.authors[identifier]/lobbyplag.data.authors_count[identifier])*100)).toFixed(2)+'%)</span>'));
						
							var $links = $('<div class="links btn-group"></div>');
							if (person.lqdn !== '') {
								$links.append($('<a class="btn btn-small btn-primary" href="'+(person.lqdn)+'"><abbr title="La Quadrature du Net">LQDN</abbr> Political Memory</a>'));
							}
							$links.append(' ');
							if (person.agw !== '') {
								$links.append($('<a class="btn btn-small btn-primary" href="'+(person.agw)+'">Abgeordnetenwatch</a>'));
							}

							$row.append($('<td></td>').append($links));
						
						
							$table.append($row);
						
						});

						$('#compare-action').html($table);
					
					break;
					case "lobbyists":
				
						var $table = $('<table class="table committee-members"><thead><tr><th>Lobbyist</th><th>Description</th><th>Documents</th></tr></thead><tbody></tbody></table>');

						$(lobbyplag.data.lobbyists).each(function(idx,lobbyist){
						
							if (lobbyist.title === '<em>Unknown</em>') return;
						
							var $row = $('<tr></tr>');
						
							$row.append($('<td class="title"></td>').append('<a href="'+lobbyist.url+'" rel="nofollow">'+lobbyist.title+'</a>'));
						
							if (lobbyist.description && lobbyist.description !== null) {
							
								$row.append($('<td class="description"></td>').append('<span>'+lobbyist.description+'</span>'));
							
							} else {
							
								$row.append($('<td class="description"></td>'));
							
							}

							var $documents = $('<td class="documents"></td>');

							$(lobbyist.sources).each(function(idx,src){
							
								var source = lobbyplag.data.sources[src];
							
								$documents.append('<a class="btn btn-small btn-primary" href="'+source.url+'">'+(idx+1)+'</a>');
							
							});

							$row.append($documents);
						
							$table.append($row);
						
						});
				
						$('#compare-action').html($table);

					break;
					case "problems":

						$('#compare-action').html('');

						$(lobbyplag.data.problems).each(function(idx,problem){
						
							$('#compare-action')
							.append(
								$('<section class="problem"></section>')
								.append('<h3>'+problem.title+'</h3>')
								.append('<p>'+problem.description+'</p>')
							);
						
						});
				
					break;
					case "overview":
				
						var $table = $('<table class="table"><thead><tr><th>Lobby Proposals</th><th>Amendments</th><th>Committee Members</th><th>Implications</th></tr></thead><tbody></tbody></table>');
				
						$(lobbyplag.data.plags).each(function(plagidx,plag){
					
							var $row = $('<tr></tr>');

							var $lobby = $('<td></td>');

							$(plag.sources).each(function(idx, source){
							
								$lobby.append(lobbyplag.helper.source(source));
							
							});

							$row.append($lobby);
					
							/* committee members and amendments */

							var $amendments = $('<td></td>');
						
							$(plag.amendments).each(function(idx,uid){
						
								$amendments.append(lobbyplag.helper.amendment(uid, plag.id));
						
							});

							$row.append($amendments);

							$row.append($('<td></td>').append(lobbyplag.helper.amendment_authors(plag.amendments)));

							/* problem */

							$row.append($('<td></td>').append(lobbyplag.helper.problem(plag.problems[0])));

							$('tbody', $table).append($row);
					
						});
										
						$('#compare-action').html($table);
					

					break;
					default:
				
						location.href = '#/compare/overview';
				
					break;
				
				}
				
			}
			
			/* check vor overlay */
			
			if (subparts.length === 4) {

				lobbyplag.comparison(subparts[3], subparts[2]);
				
			}

		}
	},
	router: function() {
		if (location.hash === '' || location.hash !== lobbyplag.route.hash) {
			lobbyplag.route.hash = location.hash;
			var hash = location.hash.replace(/#!/g,'#').match(/^#\/([a-z0-9\-]+)(\/(.*))?$/);
			if (hash) {
				var current = hash[1].toLowerCase();
				var sub = (hash.length === 4 && typeof hash[3] === 'string') ? hash[3].toLowerCase() : null;
				if (lobbyplag.route.current !== current || (lobbyplag.route.current === current && lobbyplag.route.sub !== sub)) {
					var found = false;
					if (("routes" in lobbyplag) && (hash[1] in lobbyplag.routes)) {
						found = true;
						lobbyplag.route.proposed = current;
						lobbyplag.routes[current](sub);
					} 
					if (current !== lobbyplag.route.current && $('#view-'+current).length) {
						found = true;
						$('li', '#header-nav').removeClass('active');
						$('a[href*='+current+']', '#header-nav').parent().addClass('active');
						$('.view', '#main').fadeOut('fast', function(){
							setTimeout(function(){
								$('#view-'+current).fadeIn('fast');
							},250);
						});
					}
					if (found) {
						lobbyplag.route.current = current;
						lobbyplag.route.sub = sub;
					} else if (lobbyplag.route.current === '') {
						location.hash = '#/'+lobbyplag.route.default;
					}
				}
			} else {
				location.hash = '#/'+lobbyplag.route.default;
			}
		}
	},
	comparison: function(uid, plagid) {

		if (!uid || !plagid) return;

		location.href = '#/'+([lobbyplag.route.proposed, lobbyplag.route.subroute, '#', plagid, uid]).join('/');
		
		var amendment = lobbyplag.data.amendments[lobbyplag.data.index.amendments[uid]];
		var plag = lobbyplag.data.plags[lobbyplag.data.index.plags[plagid]];
		
		var $table = $('<table class="table"><thead><tr><th>Lobby Document</th><th>Amendment</th></tr></thead><tbody></tbody></table>');
		
		$('tbody', $table).append(
			$('<tr></tr>')
				.append($('<td></td>').append(lobbyplag.helper.diff(plag.diff)))
				.append($('<td></td>').append(lobbyplag.helper.diff(amendment.diff)))
		);

		var $lobby_info = $('<td></td>');
		
		$(plag.sources).each(function(idx,s){
			
			var source = lobbyplag.data.sources[lobbyplag.data.index.sources[s.id]];
			var lobbyist = lobbyplag.data.lobbyists[lobbyplag.data.index.lobbyists[source.lobbyists[0]]];
			
			var $source = $('<div class="display-source"></div>');
			$source.append($('<a class="lobbyist" href="'+lobbyist.url+'">'+lobbyist.title+'</a>'));
			$source.append($('<a href="'+source.url+'" class="badge badge-info" title="Download the Document">Source</a>'));
			if (s.pages.match(/^[0-9]+$/)) {
				$source.append($('<span class="badge badge-info">Page '+(s.pages)+'</span>'));
			} else {
				$source.append($('<span class="badge badge-info">Pages '+(s.pages)+'</span>'));
			}
			
			$lobby_info.append($source);
			
		});
		
		var $amd_info = $('<td></td>');
		
		$amd_info.append(lobbyplag.helper.amendment(uid));
		
		$(lobbyplag.helper.amendment_authors([uid])).each(function(idx,e){
			$amd_info.append(e);
		});

		$('tbody', $table).append(
			$('<tr></tr>')
				.append($lobby_info)
				.append($amd_info)
		);
		
		$('#overlay-content').html($table);
		$('#overlay-container').fadeIn('fast');
	},
	helper: {
		diff: function(diff) {
			var $diff_c = $('<div class="diff-container"></div>');
			var $diff = $('<div class="diff"></div>');
			$diff.html(diff);
			var $diff_button_old = $('<a href="javascript:;" class="btn btn-mini btn-inverse button-old">Regulation Draft</a>');
			var $diff_button_all = $('<a href="javascript:;" class="btn btn-mini btn-primary button-all">Differences</a>');
			var $diff_button_new = $('<a href="javascript:;" class="btn btn-mini btn-inverse button-new">Changed Version</a>');
			$diff_button_all.click(function(evt){
				if ($(this).hasClass('btn-primary')) return;
				$('a', $(this).parent()).not(this).removeClass('btn-primary').addClass('btn-inverse');
				$(this).removeClass('btn-inverse').addClass('btn-primary');
				$('a.button-all', '#overlay-content').not(this).click();
				$diff.removeClass('old')
				$diff.removeClass('new');
			});
			$diff_button_new.click(function(evt){
				if ($(this).hasClass('btn-primary')) return;
				$('a', $(this).parent()).not(this).removeClass('btn-primary').addClass('btn-inverse');
				$(this).removeClass('btn-inverse').addClass('btn-primary');
				$('a.button-new', '#overlay-content').not(this).click();
				$diff.removeClass('old')
				$diff.addClass('new');
			});
			$diff_button_old.click(function(evt){
				if ($(this).hasClass('btn-primary')) return;
				$('a', $(this).parent()).not(this).removeClass('btn-primary').addClass('btn-inverse');
				$(this).removeClass('btn-inverse').addClass('btn-primary');
				$('a.button-old', '#overlay-content').not(this).click();
				$diff.addClass('old')
				$diff.removeClass('new');
			});
			var $diff_buttons = $('<div class="diff-buttons btn-group"></div>');
			$diff_buttons.append($diff_button_old);
			$diff_buttons.append($diff_button_all);
			$diff_buttons.append($diff_button_new);
			$diff_c.append($diff_buttons);
			$diff_c.append($diff);
			return $diff_c;
			
		},
		person: function(identifier) {
			var $person = $('<div class="display-person"></div>');
			var $person_name = $('<a href="javascript:;" class="person-name">'+lobbyplag.helper.person_name(identifier)+'</a>');
			$person_name.click(function(){
				$('.display-person .person-name').not(this).popover('hide');// here
				window.popover_away = false
				window.popover_visible = true
			}).popover({
				html: true,
				placement: 'top',
				trigger: 'click',
				title: lobbyplag.helper.person_name(identifier),
				content: lobbyplag.helper.person_details(identifier)
			});
			$person.append($person_name);
			$person.append(' ');
			$person.append($('<span class="badge badge-warning" title="Number amendmends with lobby content">'+lobbyplag.data.stats.authors[identifier]+'</span>')); // lobbyplag.data.authors_count[identifier]
			return $person;
		},
		person_name: function(person) {
			var name = person.toLowerCase().replace(/([^\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F][\u0030-\u0039\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F])/g, function($1){
				return $1.slice(0,1)+$1.slice(1,2).toUpperCase();
			});
			name = name.charAt(0).toUpperCase()+name.slice(1);
			return name;
		},
		person_details: function(person) {
			var p = lobbyplag.data.persons[person];
			var $person = $('<div class="display-person-details"></div>');
			$person.append($('<div class="group">Group: <strong><abbr title="'+lobbyplag.data.groups[p.group]['long']+'">'+lobbyplag.data.groups[p.group]['short']+'</abbr></strong></div>'));
			
			$person.append($('<div class="country">Country: <strong>'+lobbyplag.data.countries[p.country]+'</strong></div>'));

			$person.append($('<div class="stat">Amendments with lobby content: <strong>'+lobbyplag.data.stats.authors[person]+' of '+lobbyplag.data.authors_count[person]+' ('+(((lobbyplag.data.stats.authors[person]/lobbyplag.data.authors_count[person])*100)).toFixed(2)+'%)</strong></div>'));
			
			if (p.lqdn !== '' || p.agw !== '') {
				var $links = $('<div class="country btn-group"></div>');
				if (p.lqdn !== '') {
					$links.append(' ');
					$links.append($('<a class="btn btn-small btn-primary" href="'+(p.lqdn)+'"><abbr title="La Quadrature du Net">LQDN</abbr> Political Memory</a>'));
				}
				if (p.agw !== '') {
					$links.append(' ');
					$links.append($('<a class="btn btn-small btn-primary" href="'+(p.agw)+'">Abgeordnetenwatch</a>'));
				}
				$person.append($links);
			}
			return $person;
		},
		amendment_authors: function(uids) {
			var $amendment_authors = [];
			var $authors = '|';
			$(uids).each(function(idx,uid){
				$(lobbyplag.data.amendments[lobbyplag.data.index.amendments[uid]].authors).each(function(idx,author){
					if ($authors.indexOf('|'+author+'|') < 0) {
						$authors += author+'|';
						$amendment_authors.push(lobbyplag.helper.person(author));
					}
				});
			});
			return $amendment_authors; // fixme
		},
		problem: function(id) {
			/* returns a problem popover */
			var problem = lobbyplag.data.problems[lobbyplag.data.index.problems[id]];
			return $('<a href="javascript:;" class="problem-link">'+(problem.short)+'</a>').click(function(evt){
				$('.problem-link').not(this).popover('hide');
				window.popover_away = false
				window.popover_visible = true
			}).popover({
				placement: "left",
				trigger: "click",
				title: problem.title,
				content: problem.description
			});
		},
		amendment: function(uid, plagid) {
			var amendment = lobbyplag.data.amendments[lobbyplag.data.index.amendments[uid]];
			var $amendment = $('<div class="display-amendment"></div>');
			$committee = $('<span class="committee">'+amendment.committee+'</span>');
			$committee.tooltip({
				'title': lobbyplag.data.committees[amendment.committee]
			});
			$amendment.append($committee);
			$amendment.append(' ');
			$meeting = $('<span class="meeting" title="Date of the comittees meeting">'+amendment.date+'</span>');
			$amendment.append(' ');
			$amendment.append($meeting);
			$amd = $('<span class="amendment" title="Amendment number at that comittee meeting">#'+amendment.amendment+'</span>');
			$amendment.append(' ');
			$amendment.append($amd);
			if (plagid) {
				var $diff = $('<a href="javascript:;" class="show-diff badge badge-important" title="Compare the Amendment with the Lobbyists proposal">Compare</a>');
				$diff.click(function(evt){
					evt.preventDefault();
					lobbyplag.comparison(uid, plagid);
					return false;
				});
				$amendment.append($diff);
			}
			return $amendment;
		},
		source: function(s) {
			var source = lobbyplag.data.sources[lobbyplag.data.index.sources[s.id]];
			var lobbyist = lobbyplag.data.lobbyists[lobbyplag.data.index.lobbyists[source.lobbyists[0]]];
			var $source = $('<div class="display-source"></div>');
			var $lobbyist = $('<a class="lobbyist" href="'+lobbyist.url+'">'+lobbyist.title+'</a>');
			var $badge = $('<a href="'+source.url+'" class="badge badge-info" title="Download the Document">Source</a>');
			$source.append($lobbyist);
			$source.append($badge);
			return $source;
		}
	}
}
lobbyplag.load();
