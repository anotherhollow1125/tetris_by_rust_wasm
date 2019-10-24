mod utils;

use wasm_bindgen::prelude::*;

extern crate tetris_lib;
use tetris_lib::game;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    fn rand_gen_js() -> u32;
}

#[wasm_bindgen]
pub struct Game {
    _game : game::Game,
    field : [u8; 200],
    clear : [u8; 200],
    next  : [u8; 48],
    hold  : [u8; 16],
}

#[wasm_bindgen]
impl Game {
    pub fn new() -> Game {
        utils::set_panic_hook();

        let rand_gen = Box::new(|| rand_gen_js());

        Game {
            _game : game::Game::new(rand_gen),
            field : [0; 200],
            clear : [0; 200],
            next  : [0; 48],
            hold  : [0; 16],
        }
    }

    pub fn get_score(&self) -> u32 {
        self._game.get_score()
    }

    pub fn get_clearlines(&self) -> u32 {
        self._game.get_clearlines()
    }

    pub fn is_gameover(&self) -> bool {
        self._game.is_gameover()
    }

    pub fn can_use_hold(&self) -> bool {
        self._game.can_use_hold()
    }

    pub fn rendering(&mut self) {
        let r = self._game.rend_field();
        for n in 0..200 {
            let i = n / 10;
            let j = n % 10;
            let b = r[i][j];

            self.field[n] = b.get_color() as u8;
            self.clear[n] = (if b.is_clearing() { 1 } else { 0 }) as u8;
        }

        for ind in 0..3 {
            let next = self._game.rend_next(ind);
            for n in 0..16 {
                let i = n / 4;
                let j = n % 4;

                self.next[16*ind + n] = next[i][j].get_color() as u8;
            }
        }

        let hold = self._game.rend_hold();
        for n in 0..16 {
            let i = n / 4;
            let j = n % 4;

            self.hold[n] = hold[i][j].get_color() as u8;
        }
    }

    pub fn field_ptr(&self) -> *const u8 {
        self.field.as_ptr()
    }

    pub fn clear_ptr(&self) -> *const u8 {
        self.clear.as_ptr()
    }

    pub fn next_ptr(&self) -> *const u8 {
        self.next.as_ptr()
    }

    pub fn hold_ptr(&self) -> *const u8 {
        self.hold.as_ptr()
    }

    pub fn get_interval_ratio(&self) -> f32 {
        self._game.get_interval_ratio()
    }

    pub fn tick(&mut self, key_a: bool,
                key_b : bool, key_hard : bool,
                key_d : bool, key_r    : bool,
                key_l : bool, key_hold : bool) {
        self._game.tick([
            key_a    , key_b,
            key_hard , key_d,
            key_r    , key_l,
            key_hold
        ]);
    }
}
