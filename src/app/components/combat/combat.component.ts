import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import moves from '../../data/moves.json';
import pkmn from '../../data/pkmn.json';

// enums & types
enum WeatherCondition {
  Rain = 'rain',
  Sun = 'sun'
}
enum MoveNature {
  Attack = 'attack',
  Effect = 'effect'
}
enum MoveKind {
  Physical = 'physical',
  Special = 'special'
}
enum Element {
  Normal = 'normal',
  Grass = 'grass',
  Electric = 'electric',
  Fire = 'fire',
  Psychic = 'psychic',
  Ghost = 'ghost',
  Dark = 'dark',
  Water = 'water',
  Rock = 'rock',
  Ground = 'ground',
  Flying = 'flying',
  Poison = 'poison',
  Bug = 'bug',
  Steel = 'steel',
  Fairy = 'fairy',
  Fighting = 'fighting',
  Dragon = 'dragon',
  Ice = 'ice'
}
enum PkmnStat {
  Speed = "speed",
  Evasion = "evasion",
  Accuracy = "accuracy",
  Attack = "attack",
  SpecialAttack = "special_attack",
  Defense = "defense",
  SpecialDefense = "special_defense"
}
enum PkmnStatus {
  Poisoned = 'poisoned',
  Paralyzed = 'paralyzed',
  Burned = 'burned',
  Frozen = 'frozen'
}
enum EffectMoveSubject {
  Stat = 'stat',
  Status = 'status',
  Confused = 'confused',
  Recoil = 'recoil'
}
enum EffectMoveTarget {
  Rival = 'rival',
  Self = 'self'
}

enum Binding {
  Log = 'log', 
  State = 'state',
  PkmnStateChange = 'pkmn_state_change',
  CombatEnd = 'combat_end'
}
enum CombatState {
  Waiting = 'waiting',
  Busy = 'busy'
}
enum CombatEndReason {
  PlayerFlee = 'player_flee',
  RivalFlee = 'rival_flee'
}

type Trainer = {
  name: string;
  team: Pokemon[];
}
type VitalStat = {
  total: number;
  current: number;
}
type StagedStat = {
  current: number;
  stage: number;
}
type PkmnMoveItem = {
  move: Move;
  active: boolean;
  pp: VitalStat;
}
type Pokemon = {
  hp: VitalStat,
  speed: StagedStat,
  evasion: StagedStat,
  accuracy: StagedStat,
  attack: StagedStat,
  special_attack: StagedStat,
  defense: StagedStat,
  special_defense: StagedStat,
  confused: boolean,
  status: PkmnStatus,
  level: number,
  name: string,
  types: Element[],
  moves: PkmnMoveItem[]
}
type Move = {
  name: string;
  nature: MoveNature;
  kind: MoveKind;
  element: Element;
  accuracy: number;
  priority: number;
  extra?: CustomMoveEffect;
  // atk
  damage?: number;
  // fx
  subject?: EffectMoveSubject;
  target?: EffectMoveTarget;
  stat?: PkmnStat;
  stages?: number;
  amount?: number;
}
type CustomMoveEffect = {
  kind: MoveKind;
  subject: string;
  amount: number | string;
}
type Environment = {
  weather: WeatherCondition;
}


// behavior
class Combat {
  private _env: Environment;

  private _player: Trainer;
  private _rival: Trainer;

  private _playerPkmn: Pokemon;
  private _rivalPkmn: Pokemon;

  private _playerMove: Move;
  private _rivalMove: Move;

  private _runAttempts = 0;

  constructor(player: Trainer, rival: Trainer, weather: WeatherCondition = null) {
    this._player = player;
    this._rival = rival;
    this._env = {
      weather
    };

    this._playerPkmn = this._player.team[0];
    this._rivalPkmn = this._rival.team[0];
    
    Bindings.emit(Binding.State, CombatState.Waiting);
    Bindings.emit(Binding.PkmnStateChange, { isPlayer: true, pkmn: this._playerPkmn });
    Bindings.emit(Binding.PkmnStateChange, { isPlayer: false, pkmn: this._rivalPkmn });
  }
  
  getMoves(): PkmnMoveItem[] {
    return this._playerPkmn.moves;
  }

  fight(moveIdx: number) {
    if (moveIdx >= 0) {
      this._playerMove = this._playerPkmn.moves[moveIdx].move; 
    } else {
      // forced attack move or struggle if no pp
    }
    this._rivalMove = this._chooseRivalMove();
    this._turn();
  }
  
  async run() {
    if (this._tryToFlee()) {
      await this._log(`${this._playerPkmn.name} fled`);
      Bindings.emit(Binding.CombatEnd, CombatEndReason.PlayerFlee);
    } else {
      await this._log(`${this._playerPkmn.name} couldn't flee`);
      this._turn(true);
    }
  }
  
  private async _log(text: string) {
    Bindings.emit(Binding.Log, text);
    return await new Promise(res => setTimeout(res, 1e3));
  }

  private async _turn(skipPlayerPhase = false) {
    Bindings.emit(Binding.State, CombatState.Busy);
    if (skipPlayerPhase) {
      this._phase(false);
    } else {
      const isPlayerStarting = this._isPlayerStarting();
      this._phase(isPlayerStarting);
      this._phase(!isPlayerStarting);
    }
    Bindings.emit(Binding.State, CombatState.Waiting);
  }

  private _phase(isPlayer: boolean) {
    const move = isPlayer ? this._playerMove : this._rivalMove;
    const atkPkmn = isPlayer ? this._playerPkmn : this._rivalPkmn;
    const defPkmn = isPlayer ? this._rivalPkmn : this._playerPkmn;

    if (!this._accuracyCheck(move, atkPkmn, defPkmn)) {
      this._log(`Miss`);
      return;
    }
    switch (move.nature) {
      case MoveNature.Attack:
        const damage = this._calculateDamage(move, atkPkmn, defPkmn);
        defPkmn.hp.current = Math.max(0, defPkmn.hp.current - damage);
        this._log(`Dealt ${damage} damage`);
        break;
      case MoveNature.Effect:
        if (this._getAllElementsResistanceFactor(move.element, defPkmn.types) === 0) {
          this._log(`Doesn't affect`);
          return;
        }
        const target = move.target === EffectMoveTarget.Rival ? defPkmn : atkPkmn;
        switch (move.subject) {
          case EffectMoveSubject.Stat:
            if (Math.abs(target[move.stat].stage) === 6) {
              this._log(`Can't change stat stage more`);
              return;
            }
            target[move.stat].stage += move.amount;
            if (target[move.stat].stage > 6) {
              target[move.stat].stage = 6;
            }
            if (target[move.stat].stage < 6) {
              target[move.stat].stage = -6;
            }
            break;
        }
        break;
    }
    Bindings.emit('pkmnStateChange', { isPlayer, pkmn });

  }

  _chooseRivalMove() {
    const rand = Math.floor(Math.random() * this._rivalPkmn.moves.length);
    return this._rivalPkmn.moves[rand].move;
  }

  private _isPlayerStarting(): boolean {
    if (this._playerMove.priority > this._rivalMove.priority) {
      return true;
    } else if (this._rivalMove.priority > this._playerMove.priority) {
      return false;
    }
    const playerSpeed = this._getStagedStat(this._playerPkmn, PkmnStat.Speed);
    const rivalSpeed = this._getStagedStat(this._rivalPkmn, PkmnStat.Speed);
    if (playerSpeed > rivalSpeed) {
      return true;
    } else if (rivalSpeed > playerSpeed) {
      return false;
    }
    if (Math.random() >= .5) {
      return true;
    } else {
      return false;
    }
  }

  // https://bulbapedia.bulbagarden.net/wiki/Damage
  _calculateDamage(move, atkPkmn, defPkmn) {
    const multiTargetMod = move.multiTarget ? .75 : 1;
    let weatherMod = 1; 
    if ((this._env.weather === WeatherCondition.Rain && move.element === Element.Water) || (this._env.weather === WeatherCondition.Sun && move.element === Element.Fire)) {
      weatherMod = 1.5;
    } else if ((this._env.weather === WeatherCondition.Rain && move.element === Element.Fire) || (this._env.weather === WeatherCondition.Sun && move.element === Element.Water)) {
      weatherMod = .5;
    }
    const criticalMod = Math.random() < (1 / 24) ? 1.5 : 1;
    const burnedMod = atkPkmn.status === PkmnStatus.Burned && move.kind === MoveKind.Physical ? .5 : 1;
    const randomMod = (Math.round(Math.random() * 15) + 85 ) / 100;
    const STABMod = atkPkmn.types.find(type => type === move.element) ? 1.5 : 1;
    const typeMod = this._getAllElementsResistanceFactor(move.element, defPkmn.types);
    const mod = multiTargetMod * weatherMod * criticalMod * burnedMod * randomMod * STABMod * typeMod;
    const atk = this._getStagedStat(atkPkmn, move.kind === MoveKind.Physical ? PkmnStat.Attack : PkmnStat.SpecialAttack);
    const def = this._getStagedStat(defPkmn, move.kind === MoveKind.Physical ? PkmnStat.Defense : PkmnStat.SpecialDefense);
    return Math.round(((((((2 + atkPkmn.level) / 5) + 2) * move.damage * (atk / def)) / 50) + 2) * mod);
  }

  private _tryToFlee(): boolean {
    const pkmnSpeed = this._playerPkmn.speed.current;
    const rivalSpeed = this._rivalPkmn.speed.current;
    if (pkmnSpeed > rivalSpeed) { // staged stats?
      return true
    } else {
      const chance = (((pkmnSpeed * 28) / Math.max(0, rivalSpeed)) + 30 * ++this._runAttempts);
      return Math.round(Math.random() * 255) < chance;
    }
  }
  
  _accuracyCheck(move, atkPkmn, defPkmn) {
    if (!move.accuracy) {
      return true;
    }
    const acc = this._getStagedStat(atkPkmn, PkmnStat.Accuracy);
    const eva = this._getStagedStat(defPkmn, PkmnStat.Evasion);
    return (Math.random() * 100) < (move.accuracy * (acc / eva));
  }
  
  private _getStagedStat(pkmn: Pokemon, stat: PkmnStat): number {
    const { current, stage } = pkmn[stat];
    let m = 2;
    let d = 2;
    if (stage > 0) {
      m += stage;
    } else if (stage < 0) {
      d += (stage * -1);
    }
    if ([PkmnStat.Evasion, PkmnStat.Accuracy].includes(stat)) {
      m++;
      d++;
    }
    return current * (m / d);
  }
  
  _getElementResistanceFactor(atkType: Element, defType: Element): number {
    switch (defType) {
      case Element.Normal:
        if ([Element.Fighting].includes(atkType)) return 2;
        if ([Element.Ghost].includes(atkType)) return 0;
        break;
      case Element.Grass:
        if ([Element.Flying, Element.Poison, Element.Bug, Element.Fire, Element.Ice].includes(atkType)) return 2;
        if ([Element.Ground, Element.Water, Element.Grass, Element.Electric].includes(atkType)) return .5;
        break;
      case Element.Electric:
        if ([Element.Ground].includes(atkType)) return 2;
        if ([Element.Flying, Element.Steel, Element.Electric].includes(atkType)) return .5;
        break;
      case Element.Fire:
        if ([Element.Ground, Element.Rock, Element.Water].includes(atkType)) return 2;
        if ([Element.Bug, Element.Steel, Element.Fire, Element.Grass, Element.Ice].includes(atkType)) return .5;
        break;
      case Element.Psychic:
        if ([Element.Bug, Element.Ghost, Element.Dark].includes(atkType)) return 2;
        if ([Element.Fighting, Element.Psychic].includes(atkType)) return .5;
        break;
      case Element.Ghost:
        if ([Element.Ghost, Element.Dark].includes(atkType)) return 2;
        if ([Element.Poison, Element.Bug].includes(atkType)) return .5;
        if ([Element.Normal, Element.Fighting].includes(atkType)) return 0;
        break;
      case Element.Dark:
        if ([Element.Fighting, Element.Bug, Element.Fairy].includes(atkType)) return 2;
        if ([Element.Ghost, Element.Dark].includes(atkType)) return .5;
        if ([Element.Psychic].includes(atkType)) return 0;
        break;
      case Element.Water:
        if ([Element.Grass, Element.Electric].includes(atkType)) return 2;
        if ([Element.Steel, Element.Fire, Element.Water, Element.Ice].includes(atkType)) return .5;
        break;
      case Element.Rock:
        if ([Element.Fighting, Element.Ground, Element.Steel, Element.Water, Element.Grass].includes(atkType)) return 2;
        if ([Element.Normal, Element.Flying, Element.Poison, Element.Fire].includes(atkType)) return .5;
        break;
      case Element.Ground:
        if ([Element.Water, Element.Grass, Element.Ice].includes(atkType)) return 2;
        if ([Element.Poison, Element.Rock].includes(atkType)) return .5;
        if ([Element.Electric].includes(atkType)) return 0;
        break;
      case Element.Flying:
        if ([Element.Rock, Element.Electric, Element.Ice].includes(atkType)) return 2;
        if ([Element.Fighting, Element.Bug, Element.Grass].includes(atkType)) return .5;
        if ([Element.Ground].includes(atkType)) return 0;
        break;
      case Element.Poison:
        if ([Element.Ground, Element.Psychic].includes(atkType)) return 2;
        if ([Element.Fighting, Element.Poison, Element.Grass, Element.Fairy].includes(atkType)) return .5;
        break;
      case Element.Bug:
        if ([Element.Flying, Element.Rock, Element.Fire].includes(atkType)) return 2;
        if ([Element.Fighting, Element.Ground, Element.Grass].includes(atkType)) return .5;
        break;
      case Element.Steel:
        if ([Element.Fighting, Element.Ground, Element.Fire].includes(atkType)) return 2;
        if ([Element.Normal, Element.Flying, Element.Poison, Element.Rock, Element.Bug, Element.Steel, Element.Grass, Element.Psychic, Element.Ice, 'dragon', Element.Fairy].includes(atkType)) return .5;
        break;
      case Element.Fairy:
        if ([Element.Poison, Element.Steel].includes(atkType)) return 2;
        if ([Element.Fighting, Element.Bug, 'dragon', Element.Dark].includes(atkType)) return .5;
        break;
      case Element.Fighting:
        if ([Element.Flying, Element.Psychic, Element.Fairy].includes(atkType)) return 2;
        if ([Element.Rock, Element.Bug, Element.Dark].includes(atkType)) return .5;
        break;
      case 'dragon':
        if ([Element.Ice, 'dragon', Element.Fairy].includes(atkType)) return 2;
        if ([Element.Fire, Element.Water, Element.Grass, Element.Electric].includes(atkType)) return .5;
        break;
      case Element.Ice:
        if ([Element.Fighting, Element.Rock, Element.Steel, Element.Fire].includes(atkType)) return 2;
        if ([Element.Ice].includes(atkType)) return .5;
        break;
    }
    return 1;
  }

  _getAllElementsResistanceFactor(atkType: Element, defTypes: Element[]): number {
    return defTypes.map(type => this._getElementResistanceFactor(atkType, type)).reduce((a, b) => a * b, 1);
  }
  
}

// integration
const player = {
  name: 'Player',
  team: [
    pkmn.pikachu
  ]
};
const rival = {
  name: 'Rival',
  team: [
    pkmn.pidgey
  ]
};
const combat = new Combat(player, rival);

// integration: ui bindings
const rivalLifeBarWrapper = document.querySelector('.rival .life-bar');
const rivalLifeBar: HTMLDivElement = document.querySelector('.rival .life-bar-current');
const playerLifeBarWrapper = document.querySelector('.player .life-bar');
const playerLifeBar: HTMLDivElement = document.querySelector('.player .life-bar-current');
const playerHp = document.querySelector('.player .hitpoints');
const text = document.querySelector('.actionbar .text');
const mainMenu = document.querySelector('.actionbar .main-menu');
const fight = mainMenu.querySelector('.option-fight');
const bag = mainMenu.querySelector('.option-bag');
const change = mainMenu.querySelector('.option-change');
const run = mainMenu.querySelector('.option-run');
const movesMenu = document.querySelector('.actionbar .moves-menu');

function renderMovesMenu() {
  const moves = combat.getMoves();
  if (moves) {
    let mvidx = 0;
    for (let i = 0; i < 2; i++) {
      const row = document.createElement('div');
      row.classList.add('row');
      for (let j = 0; j < 2; j++) {
        mvidx += j;
        const moveDiv = document.createElement('div');
        moveDiv.classList.add('menu-option');
        moveDiv.innerHTML = moves[mvidx].move.name;
        row.appendChild(moveDiv);
        moveDiv.addEventListener('click', () => combat.fight(mvidx));
      }
    }
  } else {
    fight.addEventListener('click', () => combat.fight(null));
  }
}


renderMovesMenu();

Bindings.subscribe('log', text => {
  text.innerHTML = text;
});

Bindings.subscribe('state', state => {
  console.log('state change', state);
  switch (state) {
    case 'waiting':
      mainMenu.classList.add('visible');
      break;
    case 'busy':
      mainMenu.classList.remove('visible');
      break;
  }
});

Bindings.subscribe('pkmnStateChange', ({ isPlayer, pkmn }) => {
  console.log('combat phase res', pkmn);
  const lifeBarWrapper = isPlayer ? playerLifeBarWrapper : rivalLifeBarWrapper;
  const lifeBar = isPlayer ? playerLifeBar : rivalLifeBar;
  lifeBar.style.width = `${(pkmn.hp.current * 100) / pkmn.hp.total}%`;
  if (pkmn.hp.current / pkmn.hp.total <= .2) {
    lifeBarWrapper.classList.add('danger');
  } else {
    lifeBarWrapper.classList.remove('danger');
  }
   if (isPlayer) {
    playerHp.innerHTML = `${pkmn.hp.current}/${pkmn.hp.total}`; 
  }
});

// bag.addEventListener('click', () => { });

// change.addEventListener('click', () => { });

run.addEventListener('click', () => combat.run());


@Component({
  selector: 'pk-combat',
  templateUrl: './combat.component.html',
  styleUrls: [ './combat.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CombatComponent implements OnInit {

  constructor() {}

  ngOnInit() {

  }

}