# Converting observations in range (0,1) using log(n)/log(max) so that gradients don't vanish
import numpy as np
from game import *


def process_log(observation):
    observation = np.reshape(observation, (4, 4))
    observation_temp = np.where(observation <= 0, 1, observation)
    processed_observation = np.log2(observation_temp) / np.log2(65536)
    return processed_observation.reshape(1, 4, 4)


def get_grids_next_step(grid):
    # Returns the next 4 states s' from the current state s
    grids_list = []
    for movement in range(4):
        grid_before = grid.copy()
        env1 = Game()
        env1.set_board(grid_before)
        try:
            _ = env1.move(movement)
        except:
            pass
        grid_after = env1.get_board()
        env1.get_board()
        grids_list.append(grid_after)

    return grids_list
