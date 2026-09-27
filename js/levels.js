/* ケロちゃん ぴよぴよポン — stages (made by tools/make-levels.js; edit there).
   rows: the eggs hanging from the cloud, a/b/c/d/e/f = colours, x = stone, . = empty;
         rows alternate 8 and 7 eggs (the narrow rows sit half an egg to the right).
   sp: special eggs that come to the launcher (b bomb, r rainbow, l lightning), every: how often,
       first: which egg brings the first one.   tip: one-time help (see TIPS in game.js).
   par: [most eggs for ★3, most eggs for ★2]. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LEVELS = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return [
    { name: 'ぴよぴよ はらっぱ', theme: 0, key: 0, icon: [0,1,2], stages: [
      { rows: [
        'c c c b b a a a',
        ' c c b b b a a',
        'c c c b b a a a'
      ], tip: 'aim', par: [6, 9] },
      { rows: [
        'c c c c c c c c',
        ' a a a a a a a',
        'b b b b b b b b',
        ' c c c c c c c'
      ], tip: 'down', par: [12, 15] },
      { rows: [
        '. b a . . a b .',
        ' b b b . b b b',
        'b c b b b b c b',
        ' . c b b b c .',
        '. . c a a c . .',
        ' . . b b b . .',
        '. . . b b . . .'
      ], tip: 'wall', par: [8, 11] },
      { rows: [
        'c a a b a b a a',
        ' c c a a a b a',
        'b b b b b b c c',
        ' b c a a a a c'
      ], par: [10, 13] },
      { rows: [
        'c c c c c c c c',
        ' b b b b b b b',
        '. a a a a a a .',
        ' . . c c c . .',
        '. . . b b . . .'
      ], tip: 'drop', par: [6, 9] },
      { rows: [
        'c c b a a b c c',
        ' c b a a a b c',
        'b c b b b b c b',
        ' a b b b b b a',
        'a a b b b b a a'
      ], tip: 'swap', par: [11, 14] },
      { rows: [
        'c a a a a a a c',
        ' b a a . a a b',
        'b b b . . b b b',
        ' b b . . . b b',
        'c c b . . b c c',
        ' c a . . . a c',
        'a a a . . a a a'
      ], par: [11, 14] },
      { rows: [
        'a c a c b b a a',
        ' c c b b a a c',
        'c c b b a a c c',
        ' c b b a a c c',
        'b b a a c c b c'
      ], par: [11, 14] },
      { rows: [
        'b b c a a c b b',
        ' b b a a a b b',
        'a a c . . c a a',
        ' a a . . . a a',
        'c c . . . . c c',
        ' c . . . . . c',
        'c c . . . . c c'
      ], par: [12, 17] },
      { rows: [
        'a a a c c b b a',
        ' b a c c a a c',
        'a b b b a a c c',
        ' a a b b a a b',
        'a b c a a a a b',
        ' b a c c c c a'
      ], par: [15, 19] },
      { rows: [
        '. b c . . c b .',
        ' b b b . b b b',
        'b b b b b b b b',
        ' c c b a b c c',
        '. c c a a c c .',
        ' . c a c a c .',
        '. . b b b b . .',
        ' . . b a b . .',
        '. . . b b . . .'
      ], par: [12, 15] },
      { rows: [
        'b b a c c a b b',
        ' b b c a c b b',
        'a a c b b c a a',
        ' b a b b b a b',
        'b b a c c a b b',
        ' b c c c c c b'
      ], par: [16, 19] }
    ] },
    { name: 'ドッカン おはなばたけ', theme: 1, key: 2, icon: [0,1,3], special: 7, stages: [
      { rows: [
        'c c a a a a d d',
        ' c a a a a d d',
        'a c a d b b a d',
        ' c d d d c a a',
        'c c a c c c b b'
      ], sp: 'b', every: 8, first: 2, tip: 'bomb', par: [11, 14] },
      { rows: [
        'a d b b b b d a',
        ' a d b b b d a',
        '. d d c c d d .',
        ' . a a a a a .',
        '. . b b b b . .',
        ' . . b c b . .',
        '. . . c c . . .'
      ], sp: 'b', every: 9, par: [11, 14] },
      { rows: [
        'c c c a a c c c',
        ' c c d a d c c',
        'a d d d d d d a',
        ' a d b c b d a',
        'a b b b b b b a'
      ], sp: 'b', every: 9, par: [10, 15] },
      { rows: [
        'b b b c a c b b',
        ' . a a . d d .',
        '. d d c c d d .',
        ' d d c b c d d',
        '. d b b b c d .',
        ' . d c . c c .',
        '. . . c c . . .',
        ' . . . d . . .',
        '. . . a a . . .'
      ], sp: 'b', every: 9, par: [14, 17] },
      { rows: [
        'b b d d d c c c',
        ' b . a . c . c',
        'b a a a b b d d',
        ' c . a . b . b',
        'c c c c c a a b',
        ' c b b b d a b'
      ], sp: 'b', every: 9, par: [12, 15] },
      { rows: [
        'a b d d a a b b',
        ' a b b d a d d',
        'a c c d a a d b',
        ' c c c c b b d',
        'c c d d b c a a',
        ' c d d d c c a'
      ], sp: 'b', every: 9, par: [15, 19] },
      { rows: [
        'a b b b b b b a',
        ' . . b d b . .',
        '. . c b b c . .',
        ' . c c c c c .',
        '. c d c c d c .',
        ' . d b d b d .',
        '. . d b b d . .',
        ' . . b b b . .',
        '. . . b b . . .'
      ], sp: 'b', every: 9, par: [10, 13] },
      { rows: [
        'b d d c c c d d',
        ' a d d c b d d',
        'a a a d b b . .',
        ' d c c b c . .',
        'd d d d . . . .',
        ' d c d . . . .',
        'c c . . . . . .'
      ], sp: 'b', every: 9, par: [14, 17] },
      { rows: [
        'd b a a a a b d',
        ' b b a a a b b',
        'c c a a a a c c',
        ' c c a b a c c',
        'a a c b b c a a',
        ' b c b a b c b'
      ], sp: 'b', every: 10, par: [18, 21] },
      { rows: [
        'a a c a a c a a',
        ' d c a a a c d',
        'd b b a a b b d',
        ' d b . . . b d',
        'a . . . . . . a',
        ' b a . . . a b',
        'b b b b b b b b'
      ], sp: 'b', every: 10, par: [16, 19] },
      { rows: [
        'c c b b a a d d',
        ' c d b b a d d',
        'b b a a d d c c',
        ' b a a d d c c',
        'a a d d c c b b',
        ' a d d c c b b',
        'd d b c b b a a'
      ], sp: 'b', every: 10, par: [19, 22] },
      { rows: [
        '. a d . . d a .',
        ' a d b . b d a',
        'a b c a a c b a',
        ' a c a a a c a',
        '. d b d d b d .',
        ' . b c d c b .',
        '. . d c c d . .',
        ' . . c a c . .',
        '. . . a a . . .'
      ], sp: 'b', every: 10, par: [18, 26] }
    ] },
    { name: 'にじいろ おそら', theme: 2, key: -2, icon: [2,4,0], special: 8, stages: [
      { rows: [
        'a a b b b e c c',
        ' a a b a a c c',
        'e e c a b b a a',
        ' e c c a b a a',
        'a a a a b b a b'
      ], sp: 'r', every: 8, first: 2, tip: 'rainbow', par: [12, 17] },
      { rows: [
        'c b b b b b b c',
        ' a b c c c b a',
        'a c c . . c c a',
        ' a c . . . c a',
        'b b . . . . b b',
        ' b . . . . . b',
        'b b . . . . b b'
      ], sp: 'rb', every: 8, par: [14, 17] },
      { rows: [
        'c c c c c c c c',
        ' c a a a a a a',
        'b a b b e b b e',
        ' a e e b e e c',
        'b c e c c c e c',
        ' a a a a a a a'
      ], sp: 'rb', every: 9, par: [16, 19] },
      { rows: [
        'c b b e e b b a',
        ' . . c c a . .',
        '. e c a a c e .',
        ' e c a b b c e',
        'e c a a c e c e',
        ' e c a a b c e',
        '. e e c c e e .',
        ' . . e e e . .'
      ], sp: 'rb', every: 9, par: [16, 19] },
      { rows: [
        'a a c e a a a b',
        ' a a e e a a c',
        'b b . b b . c c',
        ' c . a . b . c',
        'c c . a a . c b',
        ' c . a . b . b'
      ], sp: 'rb', every: 9, par: [15, 18] },
      { rows: [
        'e b b c c b b e',
        ' b c e e e c b',
        'c c e e e e c c',
        ' a e a a a e a',
        'b b e a a e b b',
        ' c b e b e b c'
      ], sp: 'rb', every: 9, par: [18, 21] },
      { rows: [
        'c a a a a a a c',
        ' e a a c a a e',
        'c e e . . e e c',
        ' e e . . . e e',
        'c . . . . . . c',
        ' a e . . . e a',
        'b a e . . e a b',
        ' b a e e e a b'
      ], sp: 'rb', every: 9, par: [16, 19] },
      { rows: [
        'c a a e b b b a',
        ' b b a e b c a',
        '. . a e b c a b',
        ' . . b b b c b',
        '. . . . c c a a',
        ' . . . . e e a',
        '. . . . . . c c'
      ], sp: 'rb', every: 9, par: [18, 21] },
      { rows: [
        'b b e a b b a e',
        ' a e a a a a b',
        'a a c c c a b b',
        ' b a e c b e a',
        'b b e b b b e a',
        ' c c e c c e e',
        'c c b b a a b b'
      ], sp: 'rb', every: 9, par: [19, 26] },
      { rows: [
        'e a e c c e a e',
        ' a e e c e e a',
        '. c b b b b c .',
        ' . . e c e . .',
        '. . e c c e . .',
        ' . e c e c e .',
        'b b a a a a b b'
      ], sp: 'rb', every: 10, par: [18, 25] },
      { rows: [
        'e e a a b b c c',
        ' e a a b b c c',
        'b a b b c c e e',
        ' a b b c c e e',
        'b b c c e c a a',
        ' b c c e e e a',
        'c c e e a a b b',
        ' e e e a a b b'
      ], sp: 'rb', every: 10, par: [18, 21] },
      { rows: [
        'a a a b b a a a',
        ' . . a e a . .',
        '. . b e e b . .',
        ' . e a c a e .',
        '. e a c c a e .',
        ' . b b c b b .',
        '. . e c c e . .',
        ' . . e c e . .',
        '. . . e e . . .'
      ], sp: 'rb', every: 10, par: [14, 17] }
    ] },
    { name: 'ピカピカ もり', theme: 3, key: 3, icon: [3,1,5], special: 9, stages: [
      { rows: [
        'c c c c c c c c',
        ' d d d d d d d',
        'b b b b b b b b',
        ' d e e b c e e',
        'e a a d a a a a',
        ' c c c e b c c'
      ], sp: 'l', every: 7, first: 2, tip: 'bolt', par: [16, 22] },
      { rows: [
        'c c c d e e c e',
        ' b c b b b e c',
        'b c b b b e c a',
        ' a c b b e d e',
        'a a d b e e e e',
        ' d d d c a a a'
      ], sp: 'lr', every: 8, par: [18, 21] },
      { rows: [
        'b a a a a a a b',
        ' b a a . a a b',
        'd d b . . b d d',
        ' d b . . . b d',
        'e d b . . b d e',
        ' b b . . . b b',
        'a b b . . b b a'
      ], sp: 'lb', every: 8, par: [12, 16] },
      { rows: [
        '. c a . . a c .',
        ' b b a . a b b',
        'd d c b b c d d',
        ' a c c b c c a',
        '. a a c c a a .',
        ' . a b e b a .',
        '. . b b b b . .',
        ' . . a a a . .',
        '. . . a a . . .'
      ], sp: 'lrb', every: 8, par: [20, 26] },
      { rows: [
        'b d b c c b d b',
        ' d b c c c b d',
        'd d b c c b d d',
        ' e a a d a a e',
        'e e a c c a e e',
        ' e a c c c a e',
        'd d c c c c d d'
      ], sp: 'lrb', every: 8, par: [20, 26] },
      { rows: [
        'c c b b d b e e',
        ' c . b . d . e',
        'b b d d e e a a',
        ' b . d . e . a',
        'd d e e a a c c',
        ' d e e a a c c'
      ], sp: 'lrb', every: 8, par: [18, 21] },
      { rows: [
        'b c c c a a a c',
        ' . e c . e a .',
        '. a a a e e e .',
        ' b e e e e a d',
        '. b e e b a a .',
        ' . a a . b b .',
        '. . . a a . . .',
        ' . . . a . . .',
        '. . . c c . . .'
      ], sp: 'lrb', every: 9, par: [15, 21] },
      { rows: [
        'e e c e b b a b',
        ' c d b e a a d',
        'c c b b a a d d',
        ' c b e a c d d',
        'b b a a d d e e',
        ' b b b d d e e',
        'a a d d e e c c',
        ' a d d e e c c'
      ], sp: 'lrb', every: 9, par: [23, 26] },
      { rows: [
        'e e b d d b e e',
        ' d b d b d b d',
        'd e a b b a e d',
        ' e a . . . a e',
        'e . . . . . . e',
        ' d a . . . a d',
        'e e a e e a e e'
      ], sp: 'lrb', every: 9, par: [20, 26] },
      { rows: [
        'd a a a a a e a',
        ' c e a a e e a',
        'c a c b a a e a',
        ' a b c d a a a',
        'e b d d b e b c',
        ' e e c b b e c'
      ], sp: 'lrb', every: 9, par: [22, 26] },
      { rows: [
        'b e d a a d e b',
        ' b e d a d e b',
        'd e b . . b e d',
        ' d b . . . b d',
        'd . . . . . . d',
        ' d c . . . c d',
        'd d b . . b d d',
        ' a b b b b b a'
      ], sp: 'lrb', every: 9, par: [20, 23] },
      { rows: [
        'e a b c c b a e',
        ' a c b c b c a',
        'c a c e e c a c',
        ' c c e e e c c',
        'e e b b b b e e',
        ' e b b c b b e',
        'b b c c c c b b',
        ' a e e c e e a',
        'a c c e e c c a'
      ], sp: 'lrb', every: 9, par: [26, 29] }
    ] },
    { name: 'ころころ いしの くに', theme: 4, key: 5, icon: [4,5,2], special: 6, stages: [
      { rows: [
        'd a a a a d b b',
        ' a a a a f b b',
        'a b b d f f a a',
        ' b x d x f x a',
        'b b f f a a d d',
        ' b f f f a a d'
      ], sp: 'blr', every: 8, tip: 'stone', par: [18, 21] },
      { rows: [
        'b a c d d c a b',
        ' b b c c c b b',
        '. b d x x d b .',
        ' . d d x d d .',
        '. . f x x f . .',
        ' . . f f f . .',
        '. . . f f . . .'
      ], sp: 'blr', every: 8, par: [15, 19] },
      { rows: [
        'c c c f f c c c',
        ' b b a a a b b',
        'b x a a a a x b',
        ' a b a a a b a',
        'b x c b b c x b',
        ' b b b b b b b'
      ], sp: 'blr', every: 8, par: [18, 21] },
      { rows: [
        'x x x a a x x x',
        ' b d d a d d b',
        'a f d . . d f a',
        ' a a . . . a a',
        'a f . . . . f a',
        ' f . . . . . f',
        'f f . . . . f f'
      ], sp: 'blr', every: 8, par: [16, 19] },
      { rows: [
        'f d b b b a a f',
        ' f f b b a b a',
        'x c x b b x b x',
        ' c c b b b f a',
        'c d x a a x a a',
        ' d d a a f a f'
      ], sp: 'blr', every: 8, par: [20, 24] },
      { rows: [
        'd b b b b b b d',
        ' . . x b x . .',
        '. x f a a f x .',
        ' f f a a a f f',
        'a x a b b a x a',
        ' a b x d x b a',
        '. b f d d f b .',
        ' . . d d d . .'
      ], sp: 'blr', every: 8, par: [19, 22] },
      { rows: [
        'a a c c b b f b',
        ' a c c c b f a',
        'd c d f f f d d',
        ' c b b f f d d',
        'b b f f d d a b',
        ' x f x d x a x'
      ], sp: 'blr', every: 8, par: [18, 21] },
      { rows: [
        'c c d b b d c c',
        ' . . d b d . .',
        '. . a a a a . .',
        ' . c a b a c .',
        '. c a b b a c .',
        ' . c b a b c .',
        '. . c c c c . .',
        ' . . c c c . .',
        '. . . x x . . .'
      ], sp: 'blr', every: 9, par: [10, 14] },
      { rows: [
        'x a a a a f f x',
        ' d a a a d f b',
        'a d d f c b b b',
        ' c d b f c c b',
        'x c c b b c f x',
        ' c f b b d d f',
        'f f f d d d f f'
      ], sp: 'blr', every: 9, par: [20, 25] },
      { rows: [
        'd b b b b b b d',
        ' a b b b b b a',
        'a a b . . b a a',
        ' a x . . . x a',
        'f . . . . . . f',
        ' f f . . . f f',
        'f f d . . d f f',
        ' c c c d c c c'
      ], sp: 'blr', every: 9, par: [19, 22] },
      { rows: [
        'b b d d c c b f',
        ' d d c c a a f',
        'd x c c a a x f',
        ' d c c a a a f',
        'c x a a f f x b',
        ' c f a d f b b',
        'a a f f b b d d',
        ' a f f b b d d'
      ], sp: 'blr', every: 9, par: [22, 25] },
      { rows: [
        'a b b c c b b a',
        ' c b c c c b c',
        'x d x c c x d x',
        ' c a a d a a c',
        'f a x a a x a f',
        ' a a f c f a a',
        'c a f f f f a c'
      ], sp: 'blr', every: 9, par: [23, 39] }
    ] }
  ];
}));
