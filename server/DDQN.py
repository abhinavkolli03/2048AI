from collections import deque
import numpy as np

import keras
from keras.models import Sequential
from keras.layers import Dense, Dropout, Flatten
from keras.optimizers import Adam

from utils import process_log, get_grids_next_step
import random

class DDQN:
    def __init__(self, env):
        self.env = env.get_board()
        self.current_reward = 0
        self.reward_chart = []

        self.memory = deque(maxlen=2000)
        self.gamma = 0.95
        self.epsilon = 1.0
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.learning_rate = 0.0001
        self.tau = 0.1
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
        return model

    def act(self, state):
        self.epsilon *= self.epsilon_decay
        self.epsilon = max(self.epsilon_min, self.epsilon)
        if np.random.random() < self.epsilon:
            return np.random.randint(0, 4)
        else:
            allstates = get_grids_next_step(state)
            res = []
            for i in range(len(allstates)):
                if (allstates[i] == state).all():
                    res.append(0)
                else:
                    processed_state = process_log(allstates[i])
                    res.append(np.max(self.model.predict(processed_state)))

            a = self.model.predict(process_log(state))
            final = np.add(a, res)
            return np.argmax(final)

    def remember(self, state, action, reward, new_state, done):
        self.current_reward += reward
        self.memory.append([state, action, reward, new_state, done])

    def replay(self):
        batch_size = 64
        if len(self.memory) < batch_size:
            return
        samples = random.sample(self.memory, batch_size)
        for sample in samples:
            state, action, reward, new_state, done = sample
            target = self.model.predict(process_log(state))

            if done:
                target[0][action] = reward
            else:
                # Double DQN: Select action using the main model
                next_action = np.argmax(self.model.predict(process_log(new_state)))
                # Evaluate action using the target model
                Q_future = self.target_model.predict(process_log(new_state))[0][next_action]
                target[0][action] = reward + Q_future * self.gamma

            self.model.fit(process_log(state), target, epochs=1, verbose=0)

    def target_train(self):
        weights = self.model.get_weights()
        target_weights = self.target_model.get_weights()
        for i in range(len(target_weights)):
            target_weights[i] = weights[i] * self.tau + target_weights[i] * (1 - self.tau)
        self.target_model.set_weights(target_weights)

    def save_model(self, fn):
        self.model.save(fn)
