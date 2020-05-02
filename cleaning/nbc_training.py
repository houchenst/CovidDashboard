import pandas as pd
import numpy as np
import json

data_file = "./data/twitter/clean_tweets.csv"
training_file = "./data/twitter/naive_bayes_training.json"


class DataManager:

    def __init__(self, data_file, training_file):
        self.df = pd.read_csv(data_file)
        self.df = self.df.sample(n=1000)
        self.save_file = open(training_file, "r+")
        self.curr_data = json.loads(self.save_file.read())
        self.num_seen = len(self.curr_data["used_ids"])

    def add_labels(self, save_freq=1):
        d = {"r": "risky", "s": "safe", "n": "neutral"}
        classed = 0
        for _, row in self.df.iterrows():
            # make sure the data wasn't already reviewed
            if not row["status_id"] in self.curr_data["used_ids"]:
                print(f'Tweet #{self.num_seen} --- {row["date"]}')
                label = input(row["text"] + "\n")
                # make sure the label was a valid classification
                if label in d:
                    self.curr_data["samples"].append((row["text"], d[label]))
                    self.curr_data["used_ids"].append(row["status_id"])
                    self.num_seen += 1
                    classed +=1
                    # check if data should be saved yet
                    if classed % save_freq == 0:
                        self.save_file.seek(0)
                        self.save_file.truncate()
                        self.save_file.write(json.dumps(self.curr_data))
                        print("Saved data to file\n\n\n\n")
                # check if the user wants to quit
                elif label == "quit":
                    self.save_file.close()
                    print("Closed training file")
                    break
        print("Finished with current sample")






if __name__ == "__main__":
    dm = DataManager(data_file, training_file)
    dm.add_labels()

    
    