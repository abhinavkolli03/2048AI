from collections import deque
import numpy as np

import keras
from keras.models import Sequential
from keras.layers import Dense, Dropout, Flatten
from keras.optimizers import Adam

from utils import process_log, get_grids_next_step
import random


class DQN:
    def __init__(self, env):
        # Establishing the environment parameters to return through flask
        self.env = env.get_board()
        self.current_reward = 0
        self.reward_chart = []

        # Defining the hyperparameters for the model
        self.memory = deque(maxlen=1500)
        self.gamma = 0.95 # discount factor
        self.epsilon = 1.0 # exploration rate 
        self.epsilon_min = 0.01 
        self.epsilon_decay = 0.99 # rate of decay for exploration
        self.learning_rate = 0.005 # how quickly to update DQN weights
        self.tau = 0.125 # how quickly to update target DQN weights
        self.model = self.create_model()
        self.target_model = self.create_model()

    def create_model(self):
        model = Sequential()
        state_shape = (4, 4)
        model.add(Flatten(input_shape=state_shape))
        model.add(Dense(units=1024, activation="relu"))
        model.add(Dense(units=512, activation="relu"))
        model.add(Dense(units=256, activation="relu"))
        model.add(Dense(units=128, activation="relu"))
        model.add(Dense(units=4, activation="linear"))
        model.compile(loss="mean_squared_error", optimizer=Adam(lr=self.learning_rate))
        print(model.summary())
        return model
    
    def save_reward(self):
        # stores reward to list to display in rewards chart
        self.reward_chart.append(self.current_reward)
        self.current_reward = 0

    def act(self, state):
        # need to decay epsilon value overtime but not cross epsilon_min
        self.epsilon *= self.epsilon_decay
        self.epsilon = max(self.epsilon_min, self.epsilon)
        # choose a random state - exploration
        if np.random.random() < self.epsilon:
            return np.random.randint(0, 4)
        # deciding based on past - exploitation
        else:
            # getting four future states
            allstates = get_grids_next_step(state)
            res = []
            for i in range(len(allstates)):
                if (allstates[i] == state).all():
                    res.append(0)
                else:
                    processed_state = process_log(allstates[i])
                    # max from the 4 future Q_Values is appended in res
                    res.append(np.max(self.model.predict(processed_state)))

            a = self.model.predict(process_log(state))
            # final q_values are the sum of q_values of current state and future states
            final = np.add(a, res)

            return np.argmax(final)

    def remember(self, state, action, reward, new_state, done):
        # stores reward and collects Q data into memory
        self.current_reward += reward
        self.memory.append([state, action, reward, new_state, done])

    def replay(self):
        # updates the existing memory with a randomly selected batch of Q data
        batch_size = 64
        if len(self.memory) < batch_size:
            return
        samples = random.sample(self.memory, batch_size)
        for sample in samples:
            state, action, reward, new_state, done = sample
            target = self.target_model.predict(process_log(state))

            if done:
                target[0][action] = reward
            else:
                # Bellman Equation for update
                Q_future = max(self.target_model.predict(process_log(new_state))[0])

                # The move which was selected, its Q_Value gets updated
                target[0][action] = reward + Q_future * self.gamma
            self.model.fit((process_log(state)), target, epochs=1, verbose=0)

    def target_train(self):
        weights = self.model.get_weights()
        target_weights = self.target_model.get_weights()
        for i in range(len(target_weights)):
            target_weights[i] = weights[i] * self.tau + target_weights[i] * (1 - self.tau)
        self.target_model.set_weights(target_weights)

    def save_model(self, fn):
        self.model.save(fn)