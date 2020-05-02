import os
import numpy as np
import pandas as pd
import re

state_dict= {
        "alabama": "al",
        "alaska": "ak",
        "arizona": "az",
        "arkansas": "ar",
        "california": "ca",
        "colorado": "co",
        "connecticut": "ct",
        "delaware": "de",
        "florida": "fl",
        "georgia": "ga",
        "hawaii": "hi",
        "idaho": "id",
        "illinois": "il",
        "indiana": "in",
        "iowa": "ia",
        "kansas": "ks",
        "kentucky": "ky",
        "louisiana": "la",
        "maine": "me",
        "maryland": "md",
        "massachusetts": "ma",
        "michigan": "mi",
        "minnesota": "mn",
        "mississippi": "ms",
        "missouri": "mo",
        "montana": "mt",
        "nebraska": "ne",
        "nevada": "nv",
        "newhampshire": "nh",
        "newjersey": "nj",
        "newmexico": "nm",
        "newyork": "ny",
        "northcarolina": "nc",
        "northdakota": "nd",
        "ohio": "oh",
        "oklahoma": "ok",
        "oregon": "or",
        "pennsylvania": "pa",
        "rhodeisland": "ri",
        "southcarolina": "sc",
        "southdakota": "sd",
        "tennessee": "tn",
        "texas": "tx",
        "utah": "ut",
        "vermont": "vt",
        "virginia": "va",
        "washington": "wa",
        "westvirginia": "wv",
        "wisconsin": "wi",
        "wyoming": "wy",
        "puertorico": "pr",
        "districtofcolumbia": "dc",
    }

tweet_dir = "./data/twitter/"

def clean_place(place, state_first=False):
    '''
    Takes in a location string and outputs it
    as a lowercase two letter state abbreviation
    '''
    # print(place)
    if state_first:
        state = place.split(",")[0]
    else:
        state = place.split(",")[-1]
    
    state = re.sub(r'\W+', '', state).lower()

    if state in state_dict:
        state = state_dict[state]
    
    if state in state_dict.values():
        return state

    if not state_first:
        return clean_place(place, state_first=True)
    else:
        return None


def clean_data(df):
    # get relevant columns
    rel_cols = ["status_id", "user_id", "created_at", "text", "country_code", "place_full_name"]
    df = df[rel_cols]

    df = df[df["country_code"] == "US"]
    df = df[df["place_full_name"].notnull()]

    # add date column
    df["date"] = df["created_at"].str.slice(start=0, stop=10)
    df = df.drop("created_at", 1)
    
    # change loc info to states
    df["state"] = df["place_full_name"].map(clean_place)
    df = df[df["state"].notnull()]

    return df 


if __name__ == "__main__":
    final_df = []
    for sub_dir in os.listdir(tweet_dir):
        if os.path.isdir(os.path.join(tweet_dir, sub_dir)):
            for tweet_file in os.listdir(os.path.join(tweet_dir, sub_dir)):
                if tweet_file.lower().endswith(".csv"):
                    tweet_file_path = os.path.join(tweet_dir, sub_dir, tweet_file)
                    print(f'{tweet_file_path} being read')
                    df = pd.read_csv(tweet_file_path)
                    df = clean_data(df)
                    final_df.append(df)
    final_df = pd.concat(final_df)
    # Uncomment next line to write to file (commenting it out so I don't accidentally overwrite)
    final_df.to_csv(os.path.join(tweet_dir, "clean_tweets.csv"))
                


