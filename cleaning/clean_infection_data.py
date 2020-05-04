import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.signal import deconvolve
from scipy.optimize import nnls
from sklearn.linear_model import Ridge
from discrete_lognorm import lognorm_filter

states = {"AL":4903185, "AK":731545, "AZ":7278717, "AR":3017804, "CA":39512223, "CO":5758736, "CT":3565287, "DC":705749, "DE":973764, "FL":21477737, "GA":10617423, 
          "HI":1415872, "ID":1787065, "IL":12671821, "IN":6732219, "IA":3155070, "KS":2913314, "KY":4467673, "LA":4648794, "ME":1344212, "MD":6045680, 
          "MA":6892503, "MI":9986857, "MN":5639632, "MS":2976149, "MO":6137428, "MT":1068778, "NE":1934408, "NV":3080156, "NH":1359711, "NJ":8882190, 
          "NM":2096829, "NY":19453561, "NC":10488084, "ND":762062, "OH":11689100, "OK":3956971, "OR":4217737, "PA":12801989, "PR":3193694, "RI":1059361, "SC":5148714, 
          "SD":884659, "TN":6829174, "TX":28995881, "UT":3205958, "VT":623989, "VA":8535519, "WA":7614893, "WV":1792147, "WI":5822434, "WY":578759}

# assumptions
incubation_distr = lognorm_filter() #distribution of time to develop flu like symptoms
flu_like_daily_rate = 0.00069972011 #0.069972011% infected with flu-like symptoms each day
test_back_time = 4 #4 days from symptoms to test results back
critical_rate = 0.15
covid_symptomatic = 0.82
serial_interval = 3.96
filter_width = 20


cases_dir = "./data/infections/state_test_case.csv"
cases_csv = pd.read_csv(cases_dir)


def compute_infected(flu_pop, pos, neg, critical_rate, initial=True, iters=100, num_infected=None):
    # print(pos)
    # print(neg)
    iters -= 1
    if pos == 0 and neg == 0:
        # print("one")
        return 0

    # initil setting of num_infected
    if initial:
        num_infected = (flu_pop / max(1, neg) * pos)/covid_symptomatic
        initial = False

    # # update step
    crit_tested = num_infected * critical_rate
    if crit_tested > pos:
        # print("two")
        # print(pos/critical_rate)
        return pos/critical_rate
    else:
        adj_pos = (max(0, pos-crit_tested))
        num_infected = crit_tested + (flu_pop / max(1, neg) * adj_pos)/covid_symptomatic

    # recur
    if iters > 0:
        return compute_infected(flu_pop, pos, neg, critical_rate, initial=initial, iters=iters, num_infected=num_infected)
    else:
        # print("three")
        # print(num_infected)
        return num_infected

def make_conv_matrix(dim, kernel):
    '''
    kernel must have odd shape

    returns matrix, column sums
    '''
    k_span = int((kernel.shape[0]-1)/2)
    mat = np.zeros((dim, dim))
    for row in range(dim):
        min_row = max(0,row-k_span)
        max_row = min(dim+1, row+k_span+1)
        min_ker = max(0, k_span-row)
        max_ker = min(2*k_span+1, dim+k_span-row)
        
        mat[row][min_row: max_row] = kernel[min_ker: max_ker]
    mat = mat.T
    col_sums = np.sum(mat, axis=0)

    return mat, col_sums



if __name__ == "__main__":
    show = True
    for state in set(cases_csv["state"]):
        if state == "VT":
            state_df = cases_csv[cases_csv["state"] == state]
            # ascending dates
            state_df = state_df.sort_values(by=["date"], axis=0)
            print(state_df.head(5))

            # reported_neg_increase = np.array(state_df["negativeIncrease"])
            pos = np.array(state_df["positiveIncrease"])
            neg = np.array(state_df["negativeIncrease"])
            
            # nan-> 0 for deconv
            nn_pos = pos
            nn_pos[np.isnan(nn_pos)] = 1
            nn_neg = neg
            nn_neg[np.isnan(nn_neg)] = 1
            num_infected = np.zeros(pos.shape)

            # compute infected based on critical rate and flu-like rate
            for i in range(pos.shape[0]):
                num_infected[i] = compute_infected(flu_like_daily_rate*states[state], nn_pos[i], nn_neg[i], critical_rate)
            # pad infected with filter_width zeros
            adj_infected = np.zeros(num_infected.shape[0]+filter_width)
            adj_infected[filter_width:] = num_infected

            conv, prop_repped = make_conv_matrix(adj_infected.shape[0], incubation_distr)

            A = np.vstack((conv, np.eye(conv.shape[0])))
            b = np.hstack((adj_infected, np.zeros(conv.shape[0])))
            # non negative least squares with l2 regularization to compute most probable true infection rates
            contracted, _ = nnls(A, b)
            # adjust so number of infected remains the same
            contracted = contracted * (np.sum(adj_infected)/np.sum(contracted))

            # correct for test delay and calc r0s
            test_shifted = np.zeros(contracted.shape[0])
            r_naughts = np.zeros(contracted.shape[0])
            for i in range(contracted.shape[0]):
                if i < contracted.shape[0]-4:
                    test_shifted[i] = contracted[i+4]
                    if not (i == 0 or test_shifted[i] == 0 ):
                        r_naughts[i] = (test_shifted[i] / test_shifted[i-1])**serial_interval
                    else:
                        r_naughts[i] = np.nan
                else:
                    test_shifted[i] = np.nan
                    r_naughts[i] = np.nan

            if show:
                # ------------------VISUALIZATION-----------------------
                printable_r_naughts = np.copy(r_naughts) * 5000
                printable_r_naughts[printable_r_naughts > 25000] = 0

                days = np.arange(0,pos.shape[0]+filter_width)
                ax = plt.subplot(111)
                ax.bar(days-0.2, test_shifted, color="r", width=0.2, align="center")
                ax.bar(days+0.2, adj_infected, color="b", width=0.2, align="center")
                ax.scatter(days, printable_r_naughts, color="yellow")
                # plt.bar(days, num_infected)

                plt.show()


