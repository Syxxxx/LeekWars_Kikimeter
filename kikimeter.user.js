// ==UserScript==
// @name       		LeekWars : LeeKikiMeter
// @version			0.02
// @description  	Ce script affiche un résumé des combats de leekwars
// @match      		http://leekwars.com/report/*
// @author			Elzéar, yLark
// @grant			none
// @projectPage		https://github.com/Zear06/LeekWars_Kikimeter
// @downloadURL		https://github.com/Zear06/LeekWars_Kikimeter/raw/master/kikimeter.user.js
// @updateURL		https://github.com/Zear06/LeekWars_Kikimeter/raw/master/kikimeter.user.js
// ==/UserScript==

// URL DE LA PAGE PHP QUI RÉCEPTIONNE LES DONNÉES
var dataReceiverURL = ''; // http://<TRUC>/get.php

// ÉDITER dispData POUR CHOISIR LES COLONNES À AFFICHER
var dispData = [
	'level',
//	'XP',
	'roundsPlayed',
	'PT',
	'PTperTurn',
	'PM',
//	'equipWeapon',
	'actionsWeapon',
	'actionsChip',
	'dmg_in',
//	'dmg_out',
	'heal_in',
//	'heal_out',
	'lastHits',
//	'gainXP',
//	'gainTalent',
//	'gainHabs',
	'fails',
	'blabla',
	'crashes'
];

// Intitulés des variables
var leekData = { // variables relatives aux Leeks
	'leekFightId': 'Leek Fight ID',
	'leekId': 'Leek ID',
	'team': 'Équipe',
	'color': 'Couleur', // Couleur du poireau
	'name': 'Nom',
	'alive': 'Vivant',
	'level': 'Niveau',
	'XP': 'XP',
	'PTperTurn': 'PT/tour',
	'gainXP': 'Gain XP',
	'gainTalent': 'Gain Talent',
	'gainHabs': 'Gain Habs'
};
var roundData = { // variables relatives aux Leeks/rounds
	'roundsPlayed': 'Tours joués',
	'PT': 'PT',
	'PM': 'PM',
	'equipWeapon': 'Armes équipées', // Nombre de fois qu'une arme est équipée
	'actionsWeapon': 'Tirs', // Nombre de tirs
	'actionsChip': 'Usages Chips',
	'dmg_in': 'Dégats reçus',
	'dmg_out': 'Dégats infligés',
	'heal_in': 'Soins reçus',
	'heal_out': 'Soins lancés',
	'lastHits': 'Kills',
	'fails': 'Échecs',
	'blabla': 'Blabla',
	'crashes': 'Plantages'
};
var allData = $.extend({}, leekData, roundData);

// OBJET CURRENTFIGHT
function Fight() {
	var urlTab = document.URL.split('/');
	this.fightId = parseInt(urlTab[urlTab.length - 1]);
	this.teamFight = (document.getElementById('report-general').getElementsByClassName('report').length > 2) ? 1 : 0; // vaut 1 s'il s'agit d'un combat d'équipe
	this.draw = (document.getElementsByTagName('h3')[0].textContent == 'Équipe 1') ? 1 : 0; // vaut 1 si le combat s'achève par un match nul
	this.bonus = (document.getElementsByClassName('bonus').length > 0) ? parseInt(document.getElementsByClassName('bonus')[0].textContent.replace(/[^\d.]/g, '')) : 1; // multiplicateur d'XP (par défaut : 1)
	this.nbRounds = parseInt(document.getElementById('duration').textContent.replace(/[^\d.]/g, ''));
	this.nbLeeks = 0;
	this.leeks = {};
	this.teams = [new Team(), new Team()];

	this.addLeek = function(leekFightId, team, tr) {
		var name = tr.getElementsByClassName('name')[0].textContent;
		this.leeks[name] = new Leek(leekFightId, name, team, tr);
		this.nbLeeks++;
	}
	this.addTeam = function(team, tr) {
		this.teams.push(new Team(tr));
	}
	this.addRound = function(round) {
		for (var leek in this.leeks) {
			this.leeks[leek].addRound(round);
		}
	}

	// Retourne un tableau contenant la propriété dataName de tous les poireaux
	this.leeksAllData = function(dataName) {
		var allData = [];
		for (var leek in this.leeks) {
			allData[leek] = this.leeks[leek][dataName];
		}
		return allData;
	}

	// Retourne le total d'une data pour tous les leeks
	this.fightSum = function(dataName) {
		var dataNameSum = 0;
		for (var j in this.leeks) {
			dataNameSum += this.leeks[j][dataName];
		}
		return dataNameSum;
	}

	// Retourne la somme d'une datas d'une équipe
	this.teamSum = function(teamNumber, dataName) {
		var dataNameSum = 0;
		for (var j in this.leeks) {
			if (this.leeks[j].team == teamNumber) {
				dataNameSum += this.leeks[j][dataName];
			}
		}
		return dataNameSum;
	}

	this.sumRounds = function() {

		for (var leek in this.leeks) {
			this.leeks[leek].sumRounds();
			this.leeks[leek].makePTperTurn();
		}
	}
}

// OBJET LEEK
function Leek(leekFightId, name, team, tr) {

	for (var key in leekData) {
		//this[key] = 0 ;
	}

	var linkTab = tr.getElementsByTagName('a')[0].href.split('/');
	this.leekFightId = leekFightId;
	this.leekId = parseInt(linkTab[linkTab.length - 1]); // Numéro du poireau dans le jeu
	this.name = name;
	this.team = team;
	this.level = parseInt(tr.getElementsByClassName('level')[0].textContent.replace(/[^\d.]/g, ''));
	this.XP = parseInt(document.getElementById('tt_' + tr.getElementsByClassName('xp')[0].children[0].id).textContent.split('/')[0].replace(/[^\d.]/g, ''));
	this.alive = (tr.getElementsByClassName('name')[0].children[0].className == 'alive') ? 1 : 0;
	this.gainXP = parseInt(tr.getElementsByClassName('xp')[0].children[1].textContent.replace(/[^\d.]/g, ''));
	this.gainTalent = parseInt(tr.getElementsByClassName('talent')[0].textContent.replace(/[^\-?\d.]/g, ''));
	this.gainHabs = parseInt(tr.getElementsByClassName('money')[0].children[0].firstChild.textContent.replace(/[^\d.]/g, ''));
	this.round = {};

	this.writeData = function(dataName, value) { // Initialise une valeur
		this[dataName] = value;
	};
	this.addToData = function(dataName, value) { // Incrémente une valeur
		this[dataName] += value;
	};
	this.addRound = function(round) {
		this.round[round] = {};
		for (var key in roundData) {
			this.round[round][key] = 0;
		}
	}
	this.writeRoundData = function(round, dataName, value) {
		this.round[round][dataName] = value;
	};
	this.addToRoundData = function(round, dataName, value) {
		this.round[round][dataName] += value;
	};
	this.sumRoundsDataRouns = function(dataName, firstRound, lastRound) {
		this[dataName] = 0;
		for (var i = firstRound; i <= lastRound; i++) {
			this[dataName] += this.round[i][dataName];
		}
	}
	this.sumRoundsData = function(dataName) {
		this.sumRoundsDataRouns(dataName, 1, Object.keys(this.round).length);
	}
	this.sumRounds = function() {
		for (var dataName in roundData) {
			this.sumRoundsData(dataName);
		}
	}
	this.makePTperTurn = function() {
		this.PTperTurn = this.PT / this.roundsPlayed;
	}
}

// OBJET TEAM
function Team() {
	this.nbLeeks = 0;
	this.leeks = new Array();

	this.getTeamData = function(tr) {
		var linkTab = tr.getElementsByTagName('a')[0].href.split('/');
		this.teamId = parseInt(linkTab[linkTab.length - 1]); // Numéro de la team dans le jeu

		this.name = tr.getElementsByClassName('name')[0].textContent;
		this.level = parseInt(tr.getElementsByClassName('level')[0].textContent.replace(/[^\d.]/g, ''));
		this.XP = parseInt(document.getElementById('tt_' + tr.getElementsByClassName('xp')[0].children[0].id).textContent.split('/')[0].replace(/[^\d.]/g, ''));
		this.gainXP = parseInt(tr.getElementsByClassName('xp')[0].children[1].textContent.replace(/[^\d.]/g, ''));
	}
	this.addLeek = function(name) {
		this.leeks.push(name);
		this.nbLeeks++;
	}
}

// Lit les tableaux d'équipes
function readTables() {
	var report_tables = document.getElementById('report-general').getElementsByTagName('table');
	var a = true;
	var leekFightId = 0; // Numéro unique du poireau dans le cadre de ce combat

	for (i = 0; i < report_tables.length; i++) {
		var team = (currentFight.teamFight) ? (i - 1) / 2 : i;
		if ((!currentFight.teamFight) || (i == 1) || (i == 3)) {
			var trs = report_tables[i].children[0].children;

			for (var j = 1; j < trs.length; j++) {
				if (trs[j].className != 'total') {
					currentFight.addLeek(leekFightId, team, trs[j]);

					leekFightId++;
				}
			}
		} else if ((currentFight.teamFight) && ((i == 0) || (i == 2))) {
			currentFight.addTeam(team, report_tables[i].children[0].children[1]);
		}
	}
}

// Recolorise le nom des leeks dans le rapport général. Reprend la structure et la démarche de la fonction readTables()
function colorize_report_general() {
	var report_tables = document.getElementById('report-general').getElementsByTagName('table');

	for (var i = 0; i < report_tables.length; i++) {

		if ((!currentFight.teamFight) || (i == 1) || (i == 3)) {
			var trs = report_tables[i].children[0].children;

			for (var j = 1; j < trs.length; j++) {
				if (trs[j].className != 'total') {
					var name = trs[j].children[0].textContent; // Récupère le nom du poireau

					if (trs[j].children[0].children[0].className == 'alive') {
						trs[j].children[0].children[0].children[0].style.color = currentFight.leeks[name]['color']; // Applique la couleur du poireau stockée dans la variable leeks[]
					}
					if (trs[j].children[0].children[0].className == 'dead') {
						trs[j].children[0].children[1].children[0].style.color = currentFight.leeks[name]['color']; // Applique la couleur du poireau stockée dans la variable leeks[]
					}
				}
			}
		}
	}
}

// Lit la liste des actions
function readActions() {
	var actions = document.getElementById('actions').children;

	for (var i in actions) {
		// NUMERO DE TOUR
		if (/^Tour ([0-9]+)$/.test(actions[i].textContent)) {
			var round = RegExp.$1;
			currentFight.addRound(round);
		}

		// VARIABLES UTILES POUR LES ACTIONS DE PLUSIEURS LIGNES
		if (/^([^\s]+) tire$/.test(actions[i].textContent)) {
			var attacker = RegExp.$1;
			var attackerWeapon = RegExp.$1;
			currentFight.leeks[attacker].addToRoundData(round, 'actionsWeapon', 1);

		}
		if (/^([^\s]+) lance [^\s]+$/.test(actions[i].textContent)) {
			var attacker = RegExp.$1;
			var attackerChip = RegExp.$1;
			currentFight.leeks[attacker].addToRoundData(round, 'actionsChip', 1);
		}

		// TOUR DE [LEEKNAME]
		if (/^Tour de ([^\s]+)$/.test(actions[i].textContent)) {
			currentFight.leeks[RegExp.$1].writeRoundData(round, 'roundsPlayed', 1);
			currentFight.leeks[RegExp.$1].writeData('color', actions[i].children[0].style.color); // Récupère et stock la couleur du poireau
		}

		// PT
		if (/^([^\s]+) perd ([0-9]+) PT$/.test(actions[i].textContent)) {
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'PT', parseInt(RegExp.$2));
		}

		// PM
		if (/^([^\s]+) perd ([0-9]+) PM$/.test(actions[i].textContent)) {
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'PM', parseInt(RegExp.$2));
		}

		// DEGATS
		if (/^([^\s]+) perd ([0-9]+) PV$/.test(actions[i].textContent)) {
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'dmg_in', parseInt(RegExp.$2.replace(/[^\d.]/g, '')));
			currentFight.leeks[attacker].addToRoundData(round, 'dmg_out', parseInt(RegExp.$2.replace(/[^\d.]/g, '')));
		}

		// SOINS
		if (/^([^\s]+) gagne ([0-9]+) PV$/.test(actions[i].textContent)) {
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'heal_in', parseInt(RegExp.$2.replace(/[^\d.]/g, '')));
			currentFight.leeks[attacker].addToRoundData(round, 'heal_out', parseInt(RegExp.$2.replace(/[^\d.]/g, '')));
		}

		// ARME ÉQUIPÉE
		if (/^([^\s]+) prend l'arme [^\s]+$/.test(actions[i].textContent)) {
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'equipWeapon', 1);
		}

		// ECHEC
		if (/^([^\s]+) tire... Échec !$/.test(actions[i].textContent)) {
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'fails', 1);
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'actionsWeapon', 1);
		}
		if (/^([^\s]+) lance [^\s]+... Échec !$/.test(actions[i].textContent)) {
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'fails', 1);
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'actionsChip', 1);
		}

		// MORT
		if (/^([^\s]+) est mort !/.test(actions[i].textContent)) {
			currentFight.leeks[attacker].addToRoundData(round, 'lastHits', 1);
		}

		// BLABLA
		if (/^([^\s]+) dit : /.test(actions[i].textContent)) {
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'blabla', 1);
		}

		// PLANTAGE
		if (/^([^\s]+) a planté !$/.test(actions[i].textContent)) {
			currentFight.leeks[RegExp.$1].addToRoundData(round, 'crashes', 1);
		}
	}
}

// Affiche le tableau de résumé
function displayKikimeter() {
	var table = document.createElement('table');
	table.className = 'report';

	// thead
	var thead = document.createElement('thead');

	var tr = document.createElement('tr');

	var th = document.createElement('th');
	th.appendChild(document.createTextNode('Poireau'));
	tr.appendChild(th);

	for (var i in dispData) {
		var th = document.createElement('th');
		th.appendChild(document.createTextNode(allData[dispData[i]]));
		tr.appendChild(th);
	}

	thead.appendChild(tr);
	table.appendChild(thead);

	// tbody
	var tbody = document.createElement('tbody');

	for (var j in currentFight.leeks) {
		tr = document.createElement('tr');

		td = document.createElement('td');
		td.className = 'name';

		if (currentFight.leeks[j]['alive']) {
			var span = document.createElement('span');
			span.className = 'alive';
		} else {
			var span = document.createElement('span');
			span.className = 'dead';
			td.appendChild(span);
			span = document.createElement('span');
		}

		var a = document.createElement('a');
		a.href = '/leek/' + currentFight.leeks[j]['leekId'];
		a.style.color = currentFight.leeks[j]['color'];
		a.appendChild(document.createTextNode(currentFight.leeks[j]['name']));
		span.appendChild(a);
		td.appendChild(span);

		tr.appendChild(td);

		for (var i in dispData) {
			var disp = (isNaN(currentFight.leeks[j][dispData[i]])) ? currentFight.leeks[j][dispData[i]] : Math.round(currentFight.leeks[j][dispData[i]] * 10) / 10;
			td = document.createElement('td');
			//td.appendChild(document.createTextNode(Math.round(currentFight.leeks[j][dispData[i]]*10)/10));
			td.appendChild(document.createTextNode((disp)));
			tr.appendChild(td);
		}

		tbody.appendChild(tr);
	}
	table.appendChild(tbody);

	// tfoot
	// Affichage des sommes du combat
	var tfoot = document.createElement('tfoot');

	tr = document.createElement('tr');
	tr.className = 'total';

	td = document.createElement('td');
	td.className = 'name';

	var span = document.createElement('span');
	span.className = 'alive';

	span.appendChild(document.createTextNode('Total'));
	td.appendChild(span);

	tr.appendChild(td);

	for (var i in dispData) {

		td = document.createElement('td');
		td.appendChild(document.createTextNode(Math.round(currentFight.fightSum(dispData[i]) * 10) / 10));
		tr.appendChild(td);

	}

	tfoot.appendChild(tr);
	table.appendChild(tfoot);
	// Fin affichage des sommes du combat

	var resume = document.createElement('div');
	resume.id = 'report-resume';

	// Création du titre au-dessus du tableau
	var h1 = document.createElement('h1');
	h1.appendChild(document.createTextNode('Résumé'));
	document.body.appendChild(h1);
	resume.appendChild(h1);
	resume.appendChild(table);

	// Insertion du tableau dans le DOM
	var page = document.getElementById('page');
	var report_actions = document.getElementById('report-actions');
	page.insertBefore(resume, report_actions);
}

// OBJET HIGHLIGHT (fait marquant, ou trophée)
function Highlight(img, title, description, message) {
	this.img = img;
	this.title = title;
	this.description = description;
	this.message = message;
}

function getBestLeek(dataName, maxOrMin) { // Utile uniquement dans le cadre de la fonction generateHighlights()
	var BestLeek = null;
	var draw = false;
	var threshold;
	if (maxOrMin == 'max') {
		threshold = mean(currentFight.leeksAllData(dataName)) + (0.18 * currentFight.nbLeeks + 0.34) * stdev(currentFight.leeksAllData(dataName)); // Seuil défini en fonction de la moyenne des valeurs, de l'écart type et du nombre de poireaux impliqués dans le combat
	} else {
		threshold = mean(currentFight.leeksAllData(dataName)) - (0.18 * currentFight.nbLeeks + 0.34) * stdev(currentFight.leeksAllData(dataName));
	}
	for (var j in currentFight.leeks) {
		if (BestLeek != null && currentFight.leeks[j][dataName] == currentFight.leeks[BestLeek][dataName]) {
			draw = true;
		}
		if (BestLeek == null || (currentFight.leeks[j][dataName] > currentFight.leeks[BestLeek][dataName] && maxOrMin == 'max') || (currentFight.leeks[j][dataName] < currentFight.leeks[BestLeek][dataName] && maxOrMin == 'min')) {
			BestLeek = j;
			draw = false;
		}
	}
	if (draw == true || (currentFight.leeks[BestLeek][dataName] < threshold && maxOrMin == 'max') // S'il y a égalité avec un autre poireau, ou si la valeur ne dépasse pas un certain seuil remarquable, le highlight ne sera pas affiché
		|| (currentFight.leeks[BestLeek][dataName] > threshold && maxOrMin == 'min') || currentFight.leeks[BestLeek][dataName] == 1) // Si la valeur vaut 1, ça n'est pas suffisamment exceptionnel
		BestLeek = null;
	return BestLeek;
}

// Génère les highlights
function generateHighlights() {

	// Tueur
	var BestLeek = getBestLeek('lastHits', 'max');
	if (BestLeek != null) {
		Highlights['tueur'] = new Highlight('http://static.leekwars.com/image/trophy/feller.png', 'Tueur', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a tué ' + currentFight.leeks[BestLeek]['lastHits'] + ' poireaux', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['lastHits'] / currentFight.fightSum('lastHits') * 100) + ' % des tués');
	}

	// Guerrier
	var BestLeek = getBestLeek('dmg_out', 'max');
	if (BestLeek != null) {
		Highlights['guerrier'] = new Highlight('http://static.leekwars.com/image/trophy/fighter.png', 'Guerrier', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a infligé ' + currentFight.leeks[BestLeek]['dmg_out'] + ' dégâts', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['dmg_out'] / currentFight.fightSum('dmg_out') * 100) + ' % des dégâts');
	}

	// Médecin
	var BestLeek = getBestLeek('heal_out', 'max');
	if (BestLeek != null) {
		Highlights['medecin'] = new Highlight('http://static.leekwars.com/image/trophy/carapace.png', 'Médecin', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a soigné ' + currentFight.leeks[BestLeek]['heal_out'] + ' PV', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['heal_out'] / currentFight.fightSum('heal_out') * 100) + ' % des soins');
	}

	// Bavard
	var BestLeek = getBestLeek('blabla', 'max');
	if (BestLeek != null && currentFight.leeks[BestLeek]['blabla'] > 2) {
		Highlights['bavard'] = new Highlight('http://static.leekwars.com/image/trophy/talkative.png', 'Bavard', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a parlé ' + currentFight.leeks[BestLeek]['blabla'] + ' fois', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['blabla'] / currentFight.fightSum('blabla') * 100) + ' % de ce qui a été dit');
	}

	// Éphémère
	var BestLeek = getBestLeek('roundsPlayed', 'min');
	if (BestLeek != null && currentFight.leeks[BestLeek]['roundsPlayed'] / max(currentFight.leeksAllData('roundsPlayed')) * 100 < 50) {
		Highlights['ephemere'] = new Highlight('http://static.leekwars.com/image/trophy/gardener.png', 'Éphémère', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> n\'a survécu que ' + currentFight.leeks[BestLeek]['roundsPlayed'] + ' tours', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['roundsPlayed'] / max(currentFight.leeksAllData('roundsPlayed')) * 100) + ' % du combat');
	}

	// Marcheur
	var BestLeek = getBestLeek('PM', 'max');
	if (BestLeek != null) {
		Highlights['marcheur'] = new Highlight('http://static.leekwars.com/image/trophy/walker.png', 'Marcheur', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a marché ' + currentFight.leeks[BestLeek]['PM'] + ' PM', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['PM'] / currentFight.fightSum('PM') * 100) + ' % des distances parcourues');
	}

	// Tireur
	var BestLeek = getBestLeek('actionsWeapon', 'max');
	if (BestLeek != null) {
		Highlights['tireur'] = new Highlight('http://static.leekwars.com/image/trophy/equipped.png', 'Tireur', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a tiré ' + currentFight.leeks[BestLeek]['actionsWeapon'] + ' fois', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['actionsWeapon'] / currentFight.fightSum('actionsWeapon') * 100) + ' % des tirs');
	}

	// Malchanceux
	var BestLeek = getBestLeek('fails', 'max');
	if (BestLeek != null) {
		Highlights['malchanceux'] = new Highlight('http://static.leekwars.com/image/trophy/lucky.png', 'Malchanceux', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a subi ' + currentFight.leeks[BestLeek]['fails'] + ' échecs', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['fails'] / currentFight.fightSum('fails') * 100) + ' % des échecs');
	}

	// Magicien
	var BestLeek = getBestLeek('actionsChip', 'max');
	if (BestLeek != null) {
		Highlights['magicien'] = new Highlight('http://static.leekwars.com/image/trophy/wizard.png', 'Magicien', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a utilisé des puces ' + currentFight.leeks[BestLeek]['actionsChip'] + ' fois', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['actionsChip'] / currentFight.fightSum('actionsChip') * 100) + ' % des puces');
	}

	// Buggé
	var BestLeek = getBestLeek('crashes', 'max');
	if (BestLeek != null) {
		Highlights['bugge'] = new Highlight('http://static.leekwars.com/image/trophy/breaker.png', 'Buggé', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a planté ' + currentFight.leeks[BestLeek]['crashes'] + ' fois', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['crashes'] / currentFight.fightSum('crashes') * 100) + ' % des plantages');
	}

	// Hyperactif
	var BestLeek = getBestLeek('PTperTurn', 'max');
	if (BestLeek != null && currentFight.nbLeeks > 2) {
		Highlights['hyperactif'] = new Highlight('http://static.leekwars.com/image/trophy/motivated.png', 'Hyperactif', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a un ratio de ' + Math.round(currentFight.leeks[BestLeek]['PTperTurn'] * 10) / 10 + ' PT par tour', 'Soit ' + Math.round(currentFight.leeks[BestLeek]['PTperTurn'] / mean(currentFight.leeksAllData('PTperTurn')) * 10) / 10 + ' fois plus que la moyenne');
	}

	// Glandeur
	var BestLeek = getBestLeek('PTperTurn', 'min');
	if (BestLeek != null && currentFight.nbLeeks > 2) {
		if (currentFight.leeks[BestLeek]['PTperTurn'] != 0) {
			Highlights['glandeur'] = new Highlight('http://static.leekwars.com/image/trophy/literate.png', 'Glandeur', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a un ratio PT par tour de ' + Math.round(currentFight.leeks[BestLeek]['PTperTurn'] * 10) / 10, 'Soit ' + Math.round(mean(currentFight.leeksAllData('PTperTurn')) / currentFight.leeks[BestLeek]['PTperTurn'] * 10) / 10 + ' fois moins que la moyenne');
		} else {
			Highlights['glandeur'] = new Highlight('http://static.leekwars.com/image/trophy/literate.png', 'Glandeur', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> a un ratio PT par tour de ' + Math.round(currentFight.leeks[BestLeek]['PTperTurn'] * 10) / 10, null);
		}
	}

	// Invincible
	var BestLeek = null;
	var draw = false;
	for (var j in currentFight.leeks) {
		if (BestLeek != null && currentFight.leeks[j]['dmg_in'] == currentFight.leeks[BestLeek]['dmg_in']) {
			draw = true;
		}
		if (BestLeek == null || currentFight.leeks[j]['dmg_in'] > currentFight.leeks[BestLeek]['dmg_in']) {
			BestLeek = j;
			draw = false;
		}
	}
	if (draw == false && currentFight.leeks[BestLeek]['dmg_in'] == 0) {
		Highlights['invincible'] = new Highlight('http://static.leekwars.com/image/trophy/unbeaten.png', 'Invincible', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> n\'a reçu aucun dégât', null);
	}

	// Survivant
	var BestLeek = null;
	var draw = false;
	for (var j in currentFight.leeks) {
		if (BestLeek != null && currentFight.leeks[j]['roundsPlayed'] == currentFight.leeks[BestLeek]['roundsPlayed']) {
			draw = true;
		}
		if (BestLeek == null || currentFight.leeks[j]['roundsPlayed'] > currentFight.leeks[BestLeek]['roundsPlayed']) {
			BestLeek = j;
			draw = false;
		}
	}
	if (draw == false && currentFight.nbLeeks > 2 && currentFight.teams[currentFight.leeks[BestLeek].team].nbLeeks > 1) {
		//if(draw == false &&  currentFight.nbLeeks > 2 && currentFight.teams[currentFight.leeks[BestLeek].team] > 1 ){
		Highlights['survivant'] = new Highlight('http://static.leekwars.com/image/trophy/winner.png', 'Survivant', '<span style="color:' + currentFight.leeks[BestLeek]['color'] + ';">' + currentFight.leeks[BestLeek]['name'] + '</span> est  le seul survivant', null);
	}
}

// Affiche les highlights
function displayHighlights() {

	generateHighlights(); // Génère les highlights avant des les insérer dans le DOM

	if (length(Highlights) > 0) {
		var report_highlights = document.createElement('div');
		report_highlights.id = 'report-highlights';

		// Création du titre
		var h1 = document.createElement('h1');
		h1.appendChild(document.createTextNode('Hauts faits'));
		document.body.appendChild(h1);
		report_highlights.appendChild(h1);

		for (var i in Highlights) { // Boucle sur tous les highlights

			var report_high = document.createElement('div');
			report_high.className = 'notif';

			if (Highlights[i].img != null) {
				var img = document.createElement('img');
				img.src = Highlights[i].img;
				report_high.appendChild(img);
			}

			if (Highlights[i].title != null) {
				var title = document.createElement('div');
				title.className = 'turn';
				title.appendChild(document.createTextNode(Highlights[i].title));
				report_high.appendChild(title);
			}

			if (Highlights[i].description != null) {
				var description = document.createElement('div');
				description.className = 'action';
				description.innerHTML = Highlights[i].description;
				report_high.appendChild(description);
			}

			if (Highlights[i].message != null) {
				var message = document.createElement('span');
				message.className = 'date';
				message.appendChild(document.createTextNode(Highlights[i].message));
				report_high.appendChild(message);
			}

			report_highlights.appendChild(report_high);
		}

		// Insertion dans le DOM
		var page = document.getElementById('page');
		var report_actions = document.getElementById('report-actions');
		page.insertBefore(report_highlights, report_actions);
	}
}

//	Permet de trier les tableaux en appelant le script présenté ici : http://www.kryogenix.org/code/browser/sorttable
function make_tables_sortable() {
	var s = document.createElement('script');
	s.src = 'http://kryogenix.org/code/browser/sorttable/sorttable.js';
	s.onload = function() {
		sorttable.init();
		Array.prototype.slice.call(document.getElementsByTagName('table')).forEach(
			function(t) {
				sorttable.makeSortable(t);
			}
		)
	};
	document.getElementsByTagName('head')[0].appendChild(s);
}


// FONCTIONS STATISTIQUES //
// maximum of an array
function max(arr) {
		var max = null;
		for (var i in arr) {
			if (arr[i] > max || max == null) max = arr[i];
		}
		return max;
	}
	// minimum of an array

function min(arr) {
		var min = null;
		for (var i in arr) {
			if (arr[i] < min || min == null) min = arr[i];
		}
		return min;
	}
	// Taille réelle d'un tableau (arr.length n'est pas fiable)

function length(arr) {
		var length = 0;
		for (i in arr) {
			length++;
		}
		return length;
	}
	// sum of an array

function sum(arr) {
		var sum = 0;
		for (var i in arr) {
			sum += arr[i];
		}
		return sum;
	}
	// mean value of an array

function mean(arr) {
		return sum(arr) / length(arr);
	}
	// sum of squared errors of prediction (SSE)

function sumsqerr(arr) {
		var sum = 0;
		var tmp;
		for (var i in arr) {
			tmp = arr[i] - mean(arr);
			sum += tmp * tmp;
		}
		return sum;
	}
	// variance of an array (for a population, not a sample)

function variance(arr) {
		return sumsqerr(arr) / (length(arr) - 1);
	}
	// standard deviation of an array

function stdev(arr) {
	return Math.sqrt(variance(arr));
}


// Truc AJAX pour envoyer les données à la page PHP
function getXMLHttpRequest() {
	var xhr = null;

	if (window.XMLHttpRequest || window.ActiveXObject) {
		if (window.ActiveXObject) {
			try {
				xhr = new ActiveXObject("Msxml2.XMLHTTP");
			} catch (e) {
				xhr = new ActiveXObject("Microsoft.XMLHTTP");
			}
		} else {
			xhr = new XMLHttpRequest();
		}
	} else {
		alert("Votre navigateur ne supporte pas l'objet XMLHTTPRequest...");
		return null;
	}

	return xhr;
}



var currentFight = new Fight();

//		LECTURE DES TABLEAUX

readTables();

//		LECTURE DES ACTIONS
readActions();

currentFight.sumRounds();

//		CREATION DU RESUME
displayKikimeter();

//		LISTE DES HAUTS FAITS
var Highlights = {};

//		AFFICHAGE DES HAUTS FAITS (HIGHLIGHTS)
displayHighlights();

//		MISE EN COULEUR DU NOM DES POIREAUX DANS LE RAPPORT GÉNÉRAL
colorize_report_general();

//		PERMET DE TRIER LES TABLEAUX EN CLIQUANT SUR L'ENTÊTE
make_tables_sortable();

//		ENVOI DES DONNEES SUR UNE PAGE DISTANTE
if (dataReceiverURL != '') {

	var serverFightData = [
		'fightId',
		'draw',
		'bonus',
		'nbRounds'
	];
	var serverLeekData = [
		'leekId',
		'name',
		'team',
		'alive',
		'level',
		'XP',
		'gainXP',
		'gainTalent',
		'gainHabs',
		'roundsPlayed',
		'PT',
		'PM',
		'equipWeapon',
		'actionsWeapon',
		'actionsChip',
		'dmg_in',
		'dmg_out',
		'heal_in',
		'heal_out',
		'fails',
		'lastHits',
		'blabla',
		'crashes'
	];

	var fightData = {};
	for (var j in serverFightData) {
		fightData[serverFightData[j]] = currentFight[serverFightData[j]];
	}

	var rowBDD = {};
	for (var i in currentFight.leeks) {
		rowBDD[i] = jQuery.extend({}, fightData);
		for (var j in serverLeekData) {
			rowBDD[i][serverLeekData[j]] = currentFight.leeks[i][serverLeekData[j]];
		}
	}

	var json = 'json=' + JSON.stringify(rowBDD); // mise au format JSON

	$.ajax({
		type: 'POST',
		url: dataReceiverURL,
		dataType: 'json',
		data: json,
		success: function(succss) {
			console.log(json);
		}
	});
}
