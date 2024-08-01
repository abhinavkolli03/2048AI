from __future__ import print_function

import math
import random

import gym
import numpy as np

import itertools


def pairwise(iterable):
    "s -> (s0,s1), (s1,s2), (s2, s3), ..."
    a, b = itertools.tee(iterable)
    next(b, None)
    return zip(a, b)


class Game(gym.Env):
    def __init__(self):
        self.score = 0

        self.width = 4
        self.height = 4
        self.slots = self.width * self.height

        self.board = np.zeros((self.height, self.width), int)
        self.add_number()
        self.add_number()

    # retrieve any of the empty slots in a board
    def find_slots(self):
        possibleSlots = []
        for x in range(self.width):
            for y in range(self.height):
                if self.board[x][y] == 0:
                    possibleSlots.append((x, y))
        return possibleSlots

    # trivial getter and setter methods
    def set_slot(self, x, y, val):
        self.board[x][y] = val

    def get_slot(self, x, y):
        return self.board[x][y]

    def set_board(self, board):
        self.board = board

    def get_board(self):
        return self.board

    # add a 2 or 4 at a random empty slot of the board
    def add_number(self):
        value = 2
        if random.uniform(0, 1) > 0.8:
            value = 4
        possibleSlots = self.find_slots()
        choice = random.randint(0, len(possibleSlots) - 1)
        self.set_slot(possibleSlots[choice][0], possibleSlots[choice][1], value)

    # function to restart board to initial state
    def restart(self):
        self.score = 0
        self.board = np.zeros((self.width, self.height), int)
        self.add_number()
        self.add_number()
        return self.board

    # main function to process moving in a given direction
    def move(self, direction, trial=False):
        # checking total score, changes in board, and shift pattern
        score_received = 0
        changed = False
        if direction == 0 or direction == 3:
            intended_shift = 0
        else:
            intended_shift = 1

        # changing up or down
        if direction == 0 or direction == 2:
            for y in range(self.height):
                old_state = [self.get_slot(x, y) for x in list(range(self.width))]
                new_state, score = self.processMove(old_state, intended_shift)
                score_received += score
                if old_state != new_state:
                    changed = True
                    if not trial:
                        for x in list(range(self.width)):
                            self.set_slot(x, y, new_state[x])
        # changing left or right
        elif direction == 1 or 3:
            for x in range(self.width):
                old_state = [self.get_slot(x, y) for y in list(range(self.height))]
                new_state, score = self.processMove(old_state, intended_shift)
                score_received += score
                if old_state != new_state:
                    changed = True
                    if not trial:
                        for y in list(range(self.height)):
                            self.set_slot(x, y, new_state[y])
        if not changed:
            return -math.inf
        return score_received

    # identifying the largest value found in the board
    def maxNumber(self):
        num = 0
        for x in range(len(self.board)):
            for y in range(len(self.board[0])):
                if self.board[x][y] > num:
                    num = self.board[x][y]
        return num

    # processing the row of given values to combine or shift
    def processMove(self, old_values, movement):
        shifted_row = [i for i in old_values if i != 0]
        if movement:
            shifted_row.reverse()
        # combine
        processed_score = 0
        final_combination = [0] * self.height
        skip = False
        idx = 0
        for pair in pairwise(shifted_row):
            if skip:
                skip = False
                continue
            final_combination[idx] = pair[0]
            if pair[0] == pair[1]:
                final_combination[idx] += pair[1]
                processed_score += pair[0] + pair[1]
                skip = True
            idx += 1
        if shifted_row and not skip:
            final_combination[idx] = shifted_row[-1]

        if movement:
            final_combination.reverse()

        return final_combination, processed_score

    # checks if there are any valid moves still left
    def checkComplete(self):
        # check if already reached max score
        if self.maxNumber() == 2048:
            return True
        # otherwise check if there are any possible moves after
        invalid_count = 0
        for direction in range(4):
            val = self.move(direction, trial=True)
            if val == -math.inf:
                invalid_count += 1
        if invalid_count == 4:
            return True
        return False

    # using the gym interface version of step
    def step(self, action):
        score = 0
        done = None
        score = float(self.move(action))
        if score == -math.inf:
            done = False
            reward = -10
        else:
            self.add_number()
            self.score += score
            done = self.checkComplete()
            # print(10*np.max(self.board) + np.sum(self.board))
            reward = float(10*np.max(self.board) + np.sum(self.board))
        observation = self.board

        return observation, reward, done, {}, score